# CodiesVibe Deployment Guide

Deploy CodiesVibe to a DigitalOcean droplet with SSL (Let's Encrypt).

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │           DigitalOcean Droplet              │
                    │                                             │
Internet ──────────►│  ┌─────────────────────────────────────┐   │
                    │  │            Nginx (SSL)               │   │
                    │  │  - codiesvibe.com → Frontend         │   │
                    │  │  - api.codiesvibe.com → Search API   │   │
                    │  └──────────────┬──────────────────────┘   │
                    │                 │                           │
                    │       ┌─────────┴─────────┐                │
                    │       ▼                   ▼                │
                    │  ┌─────────┐       ┌────────────┐          │
                    │  │Frontend │       │ Search API │          │
                    │  │ (static)│       │  (Node.js) │          │
                    │  └─────────┘       └──────┬─────┘          │
                    │                           │                │
                    └───────────────────────────┼────────────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                        MongoDB Atlas    Qdrant Cloud      Clerk Auth
```

## Prerequisites

- DigitalOcean droplet (Ubuntu 22.04, Docker pre-installed)
- Domain: `codiesvibe.com` configured in Cloudflare
- Cloud services ready:
  - MongoDB Atlas cluster
  - Qdrant Cloud cluster
  - Clerk application (if using auth)
  - Together AI API key

## Step 1: Cloudflare DNS Setup

Add these DNS records (with proxy **OFF** initially):

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | @ | `<DROPLET_IP>` | DNS only |
| A | www | `<DROPLET_IP>` | DNS only |
| A | api | `<DROPLET_IP>` | DNS only |

> **Note**: Keep proxy OFF until SSL is set up. You can enable it later.

## Step 2: Prepare Local Files

1. Copy `.env.production.example` to `.env.production`:
   ```bash
   cp .env.production.example .env.production
   ```

2. Fill in your production values in `.env.production`

## Step 3: Initial Server Setup

SSH into your droplet:

```bash
ssh root@<DROPLET_IP>
```

Run initial setup:

```bash
# Create app directory
mkdir -p ~/codiesvibe
cd ~/codiesvibe

# Create Docker network
docker network create codiesvibe-network
```

## Step 4: Copy Files to Server

From your local machine:

```bash
# Copy deployment files
scp docker-compose.ssl.yml root@<DROPLET_IP>:~/codiesvibe/
scp nginx.ssl.conf root@<DROPLET_IP>:~/codiesvibe/
scp .env.production root@<DROPLET_IP>:~/codiesvibe/
scp scripts/deploy-init.sh root@<DROPLET_IP>:~/codiesvibe/
scp scripts/deploy.sh root@<DROPLET_IP>:~/codiesvibe/

# Make scripts executable
ssh root@<DROPLET_IP> "chmod +x ~/codiesvibe/*.sh"
```

## Step 5: Run Initial Deployment

On the server:

```bash
cd ~/codiesvibe
./deploy-init.sh your-email@example.com
```

This script will:
1. Configure firewall (ports 80, 443, SSH)
2. Obtain SSL certificate from Let's Encrypt
3. Log into GitHub Container Registry
4. Start all services
5. Set up auto-renewal cron job

## Step 6: Verify Deployment

```bash
# Check service status
docker compose -f docker-compose.ssl.yml ps

# Check logs
docker compose -f docker-compose.ssl.yml logs -f

# Test endpoints
curl https://codiesvibe.com
curl https://api.codiesvibe.com/health
```

## Updating Deployments

For subsequent deployments:

```bash
# Update all services
./deploy.sh all

# Update only frontend
./deploy.sh frontend

# Update only search-api
./deploy.sh search-api
```

## GitHub Actions CI/CD (Optional)

To enable automated deployments via GitHub Actions:

### Required Secrets

Go to **GitHub → Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Your droplet IP address |
| `VPS_USER` | SSH user (usually `root`) |
| `VPS_SSH_PRIVATE_KEY` | SSH private key for authentication |

### Generate SSH Key

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_deploy.pub root@<DROPLET_IP>

# Add private key content to GitHub secret VPS_SSH_PRIVATE_KEY
cat ~/.ssh/github_deploy
```

### Enable VPS Deployment

In `.github/workflows/search-api-ci-cd.yml`, change:
```yaml
deploy-vps:
  if: false  # Change to: if: github.ref == 'refs/heads/main'
```

## Useful Commands

```bash
# View all logs
docker compose -f docker-compose.ssl.yml logs -f

# View specific service logs
docker compose -f docker-compose.ssl.yml logs -f search-api

# Restart services
docker compose -f docker-compose.ssl.yml restart

# Stop all services
docker compose -f docker-compose.ssl.yml down

# Check SSL certificate
openssl s_client -connect codiesvibe.com:443 -servername codiesvibe.com

# Force certificate renewal
docker compose -f docker-compose.ssl.yml run --rm certbot renew --force-renewal
docker compose -f docker-compose.ssl.yml exec nginx nginx -s reload
```

## Troubleshooting

### SSL Certificate Issues

```bash
# Check certificate status
docker compose -f docker-compose.ssl.yml run --rm certbot certificates

# View certbot logs
docker compose -f docker-compose.ssl.yml logs certbot
```

### Service Not Starting

```bash
# Check logs
docker compose -f docker-compose.ssl.yml logs search-api

# Check if ports are in use
netstat -tlnp | grep -E '80|443|4003'
```

### Image Pull Failures

```bash
# Re-authenticate with GHCR
docker logout ghcr.io
docker login ghcr.io -u <github-username>
```

## Security Checklist

- [ ] Firewall enabled (UFW)
- [ ] SSH key authentication only
- [ ] SSL/TLS enabled
- [ ] Environment variables secured
- [ ] Rate limiting enabled
- [ ] Security headers configured
