# CodiesVibe VPS Deployment Guide (Simplified for Demo)

This guide will help you deploy CodiesVibe on a DigitalOcean VPS without the complexity of Docker Compose, perfect for demo purposes.

## 🚀 Quick Overview

This simplified deployment:
- ✅ Removes Docker Compose complexity
- ✅ Eliminates CORS restrictions (demo-safe)
- ✅ Uses PM2 for process management
- ✅ Direct Nginx configuration
- ✅ Simplified MongoDB and Qdrant setup

## 📋 Prerequisites

### DigitalOcean VPS Requirements
- **Minimum**: 2 CPU, 4GB RAM, 50GB SSD
- **Recommended**: 4 CPU, 8GB RAM, 100GB SSD
- **OS**: Ubuntu 22.04 LTS

### Required API Keys
- Together AI API key
- MongoDB connection (if using external)
- Any other external service keys

## 🛠️ Step-by-Step Deployment

### Step 1: Create and Setup VPS

1. **Create DigitalOcean Droplet**
   ```bash
   # Choose Ubuntu 22.04 LTS
   # Select appropriate size (minimum 2GB RAM)
   # Add your SSH key
   ```

2. **Connect to your VPS**
   ```bash
   ssh root@your-server-ip
   ```

3. **Update system**
   ```bash
   apt update && apt upgrade -y
   ```

### Step 2: Upload Your Code

1. **Option A: Clone from Git (Recommended)**
   ```bash
   cd /opt
   git clone https://github.com/your-username/codiesvibe.git
   cd codiesvibe
   ```

2. **Option B: Upload via SCP**
   ```bash
   # From your local machine
   scp -r ./codiesvibe root@your-server-ip:/opt/
   ```

### Step 3: Run the Deployment Script

1. **Make the script executable**
   ```bash
   chmod +x /opt/codiesvibe/deploy-vps-simple.sh
   ```

2. **Set environment variables (Important!)**
   ```bash
   export TOGETHER_API_KEY="your_together_api_key_here"
   export JWT_SECRET="your_jwt_secret_here"
   export SESSION_SECRET="your_session_secret_here"
   ```

3. **Run the deployment script**
   ```bash
   cd /opt/codiesvibe
   sudo ./deploy-vps-simple.sh
   ```

   The script will:
   - Install Node.js, PM2, Nginx
   - Install and configure MongoDB
   - Install and configure Qdrant
   - Build your applications
   - Configure Nginx
   - Start all services

### Step 4: Verify Deployment

1. **Check service status**
   ```bash
   /opt/codiesvibe/check-status.sh
   ```

2. **Test endpoints**
   ```bash
   # Frontend
   curl http://your-server-ip
   
   # Backend health
   curl http://your-server-ip/health
   
   # API test
   curl http://your-server-ip/api/health
   ```

3. **Check PM2 processes**
   ```bash
   pm2 list
   pm2 logs
   ```

## 🔧 Configuration Details

### Environment Variables

The deployment script creates these `.env` files:

**Backend (.env)**
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=mongodb://admin:password123@localhost:27017/codiesvibe?authSource=admin
QDRANT_URL=http://localhost:6333
TOGETHER_API_KEY=your_together_api_key_here
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

**Search API (.env)**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://admin:password123@localhost:27017/codiesvibe?authSource=admin
QDRANT_URL=http://localhost:6333
TOGETHER_API_KEY=your_together_api_key_here
LOG_LEVEL=info
```

### Service Ports

- **Frontend**: Port 80 (via Nginx)
- **Backend**: Port 4000 (proxied via Nginx at `/api`)
- **Search API**: Port 5000 (internal only)
- **MongoDB**: Port 27017 (localhost only)
- **Qdrant**: Port 6333 (localhost only)

## 🔍 Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Restart services
   pm2 restart all
   ```

2. **MongoDB connection issues**
   ```bash
   # Check MongoDB status
   systemctl status mongod
   
   # Restart MongoDB
   systemctl restart mongod
   ```

3. **Nginx configuration errors**
   ```bash
   # Test Nginx config
   nginx -t
   
   # Restart Nginx
   systemctl restart nginx
   ```

4. **Port conflicts**
   ```bash
   # Check what's using ports
   netstat -tulpn | grep :4000
   netstat -tulpn | grep :5000
   ```

### Useful Commands

```bash
# View all logs
pm2 logs

# Restart specific service
pm2 restart codiesvibe-backend
pm2 restart codiesvibe-search-api

# Stop all services
pm2 stop all

# Check system resources
htop
df -h

# Check service status
systemctl status mongod
systemctl status qdrant
systemctl status nginx
```

## 🔒 Security Notes (For Demo)

⚠️ **This configuration is optimized for demo purposes and includes:**

- **No CORS restrictions** - All origins allowed
- **Simplified authentication** - Basic setup
- **Default passwords** - Change in production
- **No SSL/HTTPS** - HTTP only for demo

### For Production Use:
1. Enable CORS restrictions
2. Set up SSL certificates
3. Change default passwords
4. Enable firewall rules
5. Set up monitoring
6. Configure backups

## 🚀 Quick Start Commands

After deployment, use these commands:

```bash
# Check everything is running
/opt/codiesvibe/check-status.sh

# View application logs
pm2 logs

# Restart if needed
pm2 restart all

# Update code (if using git)
cd /opt/codiesvibe
git pull
npm run build
cd backend && npm run build
cd ../search-api && npm run build
pm2 restart all
```

## 📱 Accessing Your Application

- **Frontend**: `http://your-server-ip`
- **API**: `http://your-server-ip/api`
- **Health Check**: `http://your-server-ip/health`

## 🛑 Cleanup (After Demo)

To remove everything:

```bash
# Stop all services
pm2 stop all
pm2 delete all

# Stop system services
systemctl stop nginx mongod qdrant

# Remove application
rm -rf /opt/codiesvibe

# Remove databases (optional)
rm -rf /var/lib/mongodb
rm -rf /opt/qdrant

# Remove packages (optional)
apt remove --purge mongodb-org nginx nodejs
```

## 📞 Support

If you encounter issues:

1. Check the logs: `pm2 logs`
2. Verify services: `/opt/codiesvibe/check-status.sh`
3. Check system resources: `htop` and `df -h`
4. Review Nginx logs: `tail -f /var/log/nginx/error.log`

---

**Happy Demoing! 🎉**

Remember: This is a simplified setup for demo purposes. For production use, implement proper security measures, SSL certificates, and monitoring.