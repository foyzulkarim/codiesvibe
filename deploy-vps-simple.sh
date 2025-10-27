#!/bin/bash

# CodiesVibe Simple VPS Deployment Script
# For use with external MongoDB and Qdrant services
# Just deploys the app code and configures Nginx

set -e

echo "🚀 Starting CodiesVibe deployment..."
echo "This script assumes you have external MongoDB and Qdrant services ready."

# Configuration
APP_DIR="/var/www/codiesvibe"
NGINX_CONFIG="/etc/nginx/nginx.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${YELLOW}⚠️  Running as root. This is okay for initial setup.${NC}"
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing Node.js, Nginx, and PM2..."
apt install -y curl wget git nginx software-properties-common

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# Create application directory
print_status "Setting up application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Copy application files (assumes code is already on server)
print_status "Setting up application files..."
if [ -d "/tmp/codiesvibe" ]; then
    cp -r /tmp/codiesvibe/* $APP_DIR/
else
    print_warning "Please copy your application files to $APP_DIR"
    print_warning "Or modify this script to clone from your repository"
    exit 1
fi

# Install dependencies and build
print_status "Installing and building backend..."
cd $APP_DIR/backend
npm install
npm run build

print_status "Installing and building frontend..."
cd $APP_DIR/frontend
npm install
npm run build

print_status "Installing and building search-api..."
cd $APP_DIR/search-api
npm install
npm run build

# Environment files setup
print_status "Setting up environment files..."
print_warning "Please update the .env files with your external service URLs:"

# Backend .env template
cat > $APP_DIR/backend/.env << EOF
NODE_ENV=production
PORT=3001
MONGODB_URI=your_external_mongodb_connection_string
QDRANT_URL=your_external_qdrant_url
TRUST_PROXY=true
CORS_ORIGIN=https://codiesvibe.com,https://www.codiesvibe.com,http://localhost:3000
EOF

# Search API .env template
cat > $APP_DIR/search-api/.env << EOF
NODE_ENV=production
PORT=3002
QDRANT_URL=your_external_qdrant_url
CORS_ORIGIN=https://codiesvibe.com,https://www.codiesvibe.com,https://api.codiesvibe.com
EOF

# Configure Nginx
print_status "Configuring Nginx..."
cp $APP_DIR/nginx-simple.conf $NGINX_CONFIG

# Test Nginx configuration
nginx -t
if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid"
    systemctl restart nginx
    systemctl enable nginx
else
    print_error "Nginx configuration has errors"
    exit 1
fi

# Start applications with PM2
print_status "Starting applications with PM2..."
cd $APP_DIR

# Start backend
pm2 start backend/dist/main.js --name "codiesvibe-backend" --env production

# Start search-api
pm2 start search-api/dist/server.js --name "codiesvibe-search-api" --env production

# Save PM2 configuration
pm2 save
pm2 startup

print_status "Deployment completed successfully! 🎉"
echo ""
echo "📋 Summary:"
echo "   • Frontend: Static files served by Nginx"
echo "   • Backend API: Running on port 3001 (PM2)"
echo "   • Search API: Running on port 3002 (PM2)"
echo "   • Nginx: Configured for domain routing"
echo ""
echo "🌐 Next Steps:"
echo "   1. Update your .env files with actual external service URLs"
echo "   2. Configure your DNS records (see SIMPLE-DNS-SETUP.md)"
echo "   3. Set up SSL certificates (optional but recommended)"
echo ""
echo "📝 Useful Commands:"
echo "   • Check PM2 status: pm2 status"
echo "   • View logs: pm2 logs"
echo "   • Restart apps: pm2 restart all"
echo "   • Check Nginx: systemctl status nginx"
echo "   • Test Nginx config: nginx -t"