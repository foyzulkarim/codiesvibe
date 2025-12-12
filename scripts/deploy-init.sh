#!/bin/bash
# CodiesVibe - Initial Deployment Script for DigitalOcean
# Run this ONCE on a fresh droplet to set up everything
#
# Usage: ./deploy-init.sh <your-email-for-letsencrypt>
# Example: ./deploy-init.sh admin@codiesvibe.com

set -e

EMAIL="${1:-}"
DOMAIN="codiesvibe.com"
APP_DIR="$HOME/codiesvibe"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check email argument
if [ -z "$EMAIL" ]; then
    error "Usage: $0 <your-email-for-letsencrypt>"
fi

log "Starting CodiesVibe initial deployment..."

# ============================================
# Step 1: System Setup
# ============================================
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

log "Installing required packages..."
sudo apt install -y curl git ufw

# ============================================
# Step 2: Firewall Configuration
# ============================================
log "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status

# ============================================
# Step 3: Create Application Directory
# ============================================
log "Creating application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Create certbot directories
mkdir -p certbot/conf certbot/www

# ============================================
# Step 4: Create Docker Network
# ============================================
log "Creating Docker network..."
docker network create codiesvibe-network 2>/dev/null || log "Network already exists"

# ============================================
# Step 5: Download Configuration Files
# ============================================
log "Please copy the following files to $APP_DIR:"
echo "  - docker-compose.ssl.yml"
echo "  - nginx.ssl.conf"
echo "  - .env.production (with your secrets)"
echo ""
read -p "Press Enter once files are copied..."

# Verify files exist
[ -f "docker-compose.ssl.yml" ] || error "docker-compose.ssl.yml not found"
[ -f "nginx.ssl.conf" ] || error "nginx.ssl.conf not found"
[ -f ".env.production" ] || error ".env.production not found"

# ============================================
# Step 6: Create Temporary Nginx Config (for SSL cert)
# ============================================
log "Creating temporary nginx config for SSL certificate..."
cat > nginx.temp.conf << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name codiesvibe.com www.codiesvibe.com api.codiesvibe.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'Setting up SSL...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# ============================================
# Step 7: Start Temporary Nginx
# ============================================
log "Starting temporary nginx for SSL verification..."
docker run -d --name nginx-temp \
    -p 80:80 \
    -v "$APP_DIR/nginx.temp.conf:/etc/nginx/nginx.conf:ro" \
    -v "$APP_DIR/certbot/www:/var/www/certbot:ro" \
    nginx:1.25-alpine

sleep 5

# ============================================
# Step 8: Obtain SSL Certificate
# ============================================
log "Obtaining SSL certificate from Let's Encrypt..."
docker run --rm \
    -v "$APP_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$APP_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "api.$DOMAIN"

# ============================================
# Step 9: Stop Temporary Nginx
# ============================================
log "Stopping temporary nginx..."
docker stop nginx-temp && docker rm nginx-temp
rm nginx.temp.conf

# ============================================
# Step 10: Login to GitHub Container Registry
# ============================================
log "Logging into GitHub Container Registry..."
echo "You need a GitHub Personal Access Token with 'read:packages' scope"
echo "Create one at: https://github.com/settings/tokens"
read -p "Enter your GitHub username: " GH_USER
read -sp "Enter your GitHub PAT: " GH_TOKEN
echo ""

echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin

# ============================================
# Step 11: Start Application
# ============================================
log "Starting CodiesVibe application..."
docker compose -f docker-compose.ssl.yml pull
docker compose -f docker-compose.ssl.yml up -d

# ============================================
# Step 12: Verify Deployment
# ============================================
log "Waiting for services to start..."
sleep 30

log "Checking service health..."
docker compose -f docker-compose.ssl.yml ps

# Test endpoints
log "Testing endpoints..."
curl -sf "http://localhost/nginx-health" && log "Nginx: OK" || warn "Nginx: Check logs"
curl -sf "http://localhost:4003/health" && log "Search API: OK" || warn "Search API: Check logs"

# ============================================
# Step 13: Setup Auto-Renewal Cron
# ============================================
log "Setting up SSL certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * cd $APP_DIR && docker compose -f docker-compose.ssl.yml run --rm certbot renew && docker compose -f docker-compose.ssl.yml exec nginx nginx -s reload") | crontab -

log "============================================"
log "Deployment Complete!"
log "============================================"
echo ""
echo "Your application should now be available at:"
echo "  - https://codiesvibe.com"
echo "  - https://api.codiesvibe.com"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose -f docker-compose.ssl.yml logs -f"
echo "  Restart:       docker compose -f docker-compose.ssl.yml restart"
echo "  Stop:          docker compose -f docker-compose.ssl.yml down"
echo "  Update:        ./deploy.sh"
