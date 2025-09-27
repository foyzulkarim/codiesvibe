# CodiesVibe Cloudflare Tunnel Setup

Simple guide for managing your Cloudflare tunnel to expose CodiesVibe to the world.

## 🎯 Current Setup

Your working architecture:
```
Internet → Cloudflare Tunnel → localhost:80 → nginx → CodiesVibe
```

- **Main site**: https://codiesvibe.com
- **API**: https://api.codiesvibe.com/api
- **Local tunnel**: Connected via local cloudflared

## 🚀 Quick Commands

### Start Tunnel
```bash
# Start your tunnel (if not running as service)
cloudflared tunnel run
```

### Check Status
```bash
# Check tunnel status
cloudflared tunnel info

# Check if sites are accessible
curl https://codiesvibe.com
curl https://api.codiesvibe.com/api/tools
```

### Stop Tunnel
```bash
# Stop tunnel (if running in foreground)
Ctrl+C

# If running as service
sudo systemctl stop cloudflared
```

## 🔧 Tunnel Configuration

Your tunnel routes traffic to `localhost:80` where nginx handles:

- **codiesvibe.com** → Frontend React app
- **api.codiesvibe.com** → Backend API via proxy

## 📊 Monitoring

### Check if Everything is Working
```bash
# 1. Check local Docker stack
docker ps | grep codiesvibe

# 2. Check local nginx
curl http://localhost:80/nginx-health

# 3. Check public sites
curl https://codiesvibe.com
curl https://api.codiesvibe.com/api/tools
```

### View Tunnel Logs
```bash
# If tunnel running in terminal
# Logs show in real-time

# If running as service
sudo journalctl -u cloudflared -f
```

## 🛠️ Troubleshooting

### Site Not Loading
1. **Check Docker stack is running**:
   ```bash
   docker-compose -f docker-compose.production.yml ps
   ```

2. **Check nginx is responding**:
   ```bash
   curl http://localhost:80/nginx-health
   ```

3. **Check tunnel connection**:
   ```bash
   cloudflared tunnel info
   ```

### API Not Working
1. **Test API locally**:
   ```bash
   curl http://localhost:80/health
   curl http://localhost:4000/health  # Direct backend
   ```

2. **Check CORS settings** in backend environment:
   ```bash
   # Should include your domain
   CORS_ORIGIN=http://localhost,http://api.codiesvibe.com
   ```

### Tunnel Disconnecting
1. **Check internet connection**
2. **Restart tunnel**:
   ```bash
   # Stop current tunnel
   # Start again: cloudflared tunnel run
   ```

## 📁 Key Files

- **nginx.conf**: Enhanced with Cloudflare real IP detection
- **docker-compose.production.yml**: Your main application stack
- **~/.cloudflared/**: Tunnel configuration and credentials

## 🔗 Cloudflare Dashboard

Manage your tunnel at: [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)

- View tunnel status
- Modify routes
- Check traffic analytics

## 💡 Pro Tips

1. **Keep it simple**: Your current setup works great!
2. **Docker first**: Always ensure Docker stack is running before tunnel
3. **Test locally**: Use `localhost:80` to debug issues
4. **Monitor logs**: Keep an eye on tunnel connection status

---

**Remember**: The tunnel just forwards traffic to your local nginx. If nginx works locally (`localhost:80`), the tunnel will work too! 🚀