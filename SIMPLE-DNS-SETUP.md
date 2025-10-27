# Simple DNS Setup Guide for CodiesVibe

This guide shows you how to set up DNS records to point your domains directly to your VPS server.

## Prerequisites

- Your VPS server is running and has a public IP address
- You have access to your domain registrar's DNS management panel
- CodiesVibe is deployed on your VPS using the `deploy-vps-simple.sh` script

## DNS Records Setup

### Step 1: Get Your VPS IP Address

On your VPS, run:
```bash
curl ifconfig.me
```
This will show your public IP address (e.g., `123.45.67.89`)

### Step 2: Configure DNS Records

In your domain registrar's DNS management panel, create these records:

#### For the main domain (codiesvibe.com):
```
Type: A
Name: @ (or leave blank for root domain)
Value: YOUR_VPS_IP_ADDRESS
TTL: 300 (or default)
```

#### For www subdomain:
```
Type: A
Name: www
Value: YOUR_VPS_IP_ADDRESS
TTL: 300 (or default)
```

#### For API subdomain:
```
Type: A
Name: api
Value: YOUR_VPS_IP_ADDRESS
TTL: 300 (or default)
```

### Example DNS Configuration

If your VPS IP is `123.45.67.89`, your DNS records should look like:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 123.45.67.89 | 300 |
| A | www | 123.45.67.89 | 300 |
| A | api | 123.45.67.89 | 300 |

## Popular DNS Providers

### Cloudflare (DNS Only)
1. Log into Cloudflare dashboard
2. Select your domain
3. Go to DNS > Records
4. Add the A records as shown above
5. Make sure proxy status is "DNS only" (gray cloud)

### Namecheap
1. Log into Namecheap account
2. Go to Domain List > Manage
3. Click "Advanced DNS"
4. Add the A records as shown above

### GoDaddy
1. Log into GoDaddy account
2. Go to My Products > DNS
3. Select your domain
4. Add the A records as shown above

### Google Domains
1. Log into Google Domains
2. Select your domain
3. Go to DNS settings
4. Add the A records as shown above

## Verification

### Step 1: Wait for DNS Propagation
DNS changes can take 5 minutes to 48 hours to propagate worldwide. Usually it's much faster (5-30 minutes).

### Step 2: Test Your Domains
```bash
# Test if domains resolve to your VPS IP
nslookup codiesvibe.com
nslookup www.codiesvibe.com
nslookup api.codiesvibe.com

# Or use dig
dig codiesvibe.com
dig www.codiesvibe.com
dig api.codiesvibe.com
```

### Step 3: Test in Browser
- Visit `http://codiesvibe.com` - should show your frontend
- Visit `http://api.codiesvibe.com/health` - should show API health status

## SSL/HTTPS Setup (Optional but Recommended)

For production use, you should set up SSL certificates:

### Option 1: Let's Encrypt (Free)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates for your domains
sudo certbot --nginx -d codiesvibe.com -d www.codiesvibe.com -d api.codiesvibe.com

# Auto-renewal (certbot usually sets this up automatically)
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Cloudflare SSL (if using Cloudflare DNS)
1. In Cloudflare dashboard, go to SSL/TLS
2. Set encryption mode to "Full" or "Full (strict)"
3. Enable "Always Use HTTPS"

## Troubleshooting

### Domain doesn't resolve
- Check DNS records are correct
- Wait longer for DNS propagation
- Use online DNS checker tools

### Site shows "This site can't be reached"
- Verify VPS is running: `systemctl status nginx`
- Check if ports are open: `sudo ufw status`
- Verify Nginx is serving on port 80: `sudo netstat -tlnp | grep :80`

### API not working
- Check backend is running: `pm2 status`
- Verify backend port: `sudo netstat -tlnp | grep :3001`
- Check Nginx proxy configuration

### Mixed content errors (if using HTTPS)
- Make sure all API calls use HTTPS
- Update CORS settings in backend to include HTTPS URLs

## Security Notes

- Consider setting up a firewall: `sudo ufw enable`
- Keep your VPS updated: `sudo apt update && sudo apt upgrade`
- Use strong passwords for all services
- Consider changing default SSH port
- Set up fail2ban for SSH protection

## Quick Commands

```bash
# Check if your services are running
sudo systemctl status nginx
pm2 status
sudo systemctl status mongod
sudo systemctl status qdrant

# View logs
pm2 logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart services if needed
sudo systemctl restart nginx
pm2 restart all
```

## Next Steps

1. Set up SSL certificates for HTTPS
2. Configure proper backup for your database
3. Set up monitoring and alerts
4. Consider using a CDN for better performance
5. Implement proper logging and monitoring

---

That's it! Your CodiesVibe application should now be accessible via your custom domains pointing directly to your VPS.