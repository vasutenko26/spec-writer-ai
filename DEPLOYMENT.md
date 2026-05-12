# ContentForge Deployment Guide

This guide will help you deploy ContentForge (aiagentlab.fun) on a fresh server.

## 🏗️ Architecture Overview

```
User Browser (React SPA)
        ↓
Caddy Web Server (HTTPS + Reverse Proxy)
        ↓
    ┌───┴────┐
    ↓        ↓
Node.js API  Static Files
(port 3001)  (/var/www/spec-writer-ai)
    ↓
    ├─→ Google Gemini AI
    ├─→ SearXNG (Docker :8888)
    └─→ Supabase (Auth + DB)
```

## 📋 Prerequisites

### Server Requirements
- **OS**: Debian 11+ / Ubuntu 20.04+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 10GB+ free space
- **Domain**: DNS pointed to server IP

### Required Services
- Node.js 18+
- Docker & Docker Compose
- Caddy 2.x
- Git

### API Keys
1. **Google Gemini API** (Required) - Get from [aistudio.google.com](https://aistudio.google.com)
2. **Supabase Account** (Required) - Create at [supabase.com](https://supabase.com)
3. **Google PageSpeed API** (Optional) - Get from [Google Cloud Console](https://console.cloud.google.com)

## 🚀 Automated Deployment

### Option 1: Quick Deploy Script

```bash
# Clone repository
git clone https://github.com/vasutenko26/spec-writer-ai.git
cd spec-writer-ai

# Run deployment script
sudo bash deployment/deploy.sh
```

The script will:
1. Install all dependencies (Node.js, Docker, Caddy)
2. Setup project directories
3. Install npm packages
4. Build frontend
5. Start SearXNG container
6. Create systemd service
7. Configure Caddy

### Option 2: Manual Deployment

Follow steps below for full control over the deployment process.

## 📦 Manual Installation Steps

### Step 1: Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
sudo apt install -y docker.io docker-compose

# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# Install build tools
sudo apt install -y build-essential git
```

### Step 2: Clone and Setup Project

```bash
# Clone repository to /opt
sudo git clone https://github.com/vasutenko26/spec-writer-ai.git /opt/spec-writer-ai
cd /opt/spec-writer-ai

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Step 3: Configure Environment Variables

#### Backend Configuration (`server/.env`)

```bash
# Copy example file
cp server/.env.example server/.env

# Edit with your API keys
nano server/.env
```

Required variables:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
SEARXNG_URL=http://127.0.0.1:8888
PORT=3001
JWT_SECRET=generate_random_64_char_string_here
JWT_EXPIRES_IN=7d
```

Optional variables:
```env
PAGESPEED_API_KEY=your_pagespeed_api_key
GSC_CLIENT_ID=your_google_search_console_oauth_id
GSC_CLIENT_SECRET=your_gsc_oauth_secret
GSC_REDIRECT_URI=https://yourdomain.com/api/gsc/callback
```

**Generate JWT Secret:**
```bash
openssl rand -hex 32
```

#### Frontend Configuration (`.env`)

```bash
# Copy example file
cp .env.example .env

# Edit with your Supabase credentials
nano .env
```

Required variables:
```env
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_URL=https://your_project_id.supabase.co
```

### Step 4: Build Frontend

```bash
cd /opt/spec-writer-ai
npm run build

# Copy built files to web directory
sudo mkdir -p /var/www/spec-writer-ai
sudo cp -r dist/* /var/www/spec-writer-ai/
```

### Step 5: Setup SearXNG (Docker)

```bash
cd /opt/spec-writer-ai
docker-compose -f docker-compose.searxng.yml up -d

# Verify it's running
docker ps | grep searxng
curl http://localhost:8888
```

### Step 6: Setup Systemd Service

```bash
# Copy service file
sudo cp deployment/contentforge-api.service /etc/systemd/system/

# Update WorkingDirectory if needed
sudo sed -i 's|/opt/spec-writer-ai|'$(pwd)'|g' /etc/systemd/system/contentforge-api.service

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable contentforge-api
sudo systemctl start contentforge-api

# Check status
sudo systemctl status contentforge-api
```

### Step 7: Configure Caddy

```bash
# Edit Caddyfile with your domain
sudo nano /etc/caddy/Caddyfile
```

Add this configuration:
```
yourdomain.com, www.yourdomain.com {
    encode gzip

    header {
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    handle /api/* {
        reverse_proxy 127.0.0.1:3001 {
            flush_interval -1
        }
    }

    handle {
        root * /var/www/spec-writer-ai
        file_server
        try_files {path} /index.html
    }
}
```

Or use the example:
```bash
sudo cp deployment/Caddyfile.example /etc/caddy/Caddyfile
sudo sed -i 's|yourdomain.com|your-actual-domain.com|g' /etc/caddy/Caddyfile
```

Restart Caddy:
```bash
sudo systemctl restart caddy
sudo systemctl status caddy
```

### Step 8: Configure DNS

Point your domain to server IP:
```
A Record: @ → your.server.ip.address
A Record: www → your.server.ip.address
```

Wait for DNS propagation (5-30 minutes), then access your site at `https://yourdomain.com`

## 🔧 Post-Deployment

### Verify Services

```bash
# Check API service
systemctl status contentforge-api
journalctl -u contentforge-api -n 50

# Check Caddy
systemctl status caddy
journalctl -u caddy -n 50

# Check SearXNG
docker ps
docker-compose -f /opt/spec-writer-ai/docker-compose.searxng.yml logs
```

### Test API

```bash
# Health check
curl http://localhost:3001/api/health

# External access
curl https://yourdomain.com/api/health
```

### Setup Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Enable Email/Password authentication
4. Create users via Supabase dashboard or registration page
5. Copy Project ID and Anon Key to `.env`

## 🔄 Updating Deployment

### Update Code

```bash
cd /opt/spec-writer-ai
git pull origin main

# Rebuild frontend
npm install
npm run build
sudo cp -r dist/* /var/www/spec-writer-ai/

# Update backend dependencies if needed
cd server
npm install

# Restart API service
sudo systemctl restart contentforge-api
```

### Database Migrations

The SQLite database is auto-created on first run. Located at:
- `/opt/spec-writer-ai/server/db/contentforge.db`

To backup:
```bash
cp /opt/spec-writer-ai/server/db/contentforge.db ~/contentforge-backup-$(date +%Y%m%d).db
```

## 🐛 Troubleshooting

### API not starting

```bash
# Check logs
journalctl -u contentforge-api -n 100 -f

# Check if port 3001 is already in use
sudo lsof -i :3001

# Manually test
cd /opt/spec-writer-ai/server
node index.js
```

### SearXNG not working

```bash
# Check container
docker ps -a | grep searxng

# Restart container
cd /opt/spec-writer-ai
docker-compose -f docker-compose.searxng.yml restart

# Check logs
docker-compose -f docker-compose.searxng.yml logs -f
```

### Caddy SSL issues

```bash
# Check Caddy logs
journalctl -u caddy -n 100 -f

# Verify DNS is pointed correctly
dig yourdomain.com

# Test Caddy config
caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy
sudo systemctl reload caddy
```

### Frontend 404 errors

Make sure frontend files are in correct location:
```bash
ls -la /var/www/spec-writer-ai/
# Should contain: index.html, assets/, etc.
```

### Gemini API errors

- Check API key is correct in `server/.env`
- Verify key has no extra spaces/newlines
- Check quota limits at [aistudio.google.com](https://aistudio.google.com)
- Test API key directly:
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

## 📁 Important File Locations

| Component | Location |
|-----------|----------|
| Project Root | `/opt/spec-writer-ai/` |
| API Server | `/opt/spec-writer-ai/server/` |
| Web Files | `/var/www/spec-writer-ai/` |
| Systemd Service | `/etc/systemd/system/contentforge-api.service` |
| Caddy Config | `/etc/caddy/Caddyfile` |
| SQLite DB | `/opt/spec-writer-ai/server/db/contentforge.db` |
| API Logs | `journalctl -u contentforge-api` |
| Caddy Logs | `journalctl -u caddy` |

## 🔐 Security Considerations

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Keep API keys secure** - Use environment variables
3. **Regular updates** - Keep system and npm packages updated
4. **Firewall** - Allow only ports 80, 443, 22
5. **Backup database** - Regular backups of SQLite DB
6. **HTTPS only** - Caddy handles this automatically

## 📊 Performance Optimization

### Enable HTTP/2
Caddy enables HTTP/2 by default.

### Gzip Compression
Already configured in Caddyfile with `encode gzip`.

### API Caching
Consider implementing Redis for API response caching in future.

### Database Optimization
For high traffic, consider migrating from SQLite to PostgreSQL.

## 🆘 Support

- **GitHub Issues**: https://github.com/vasutenko26/spec-writer-ai/issues
- **Documentation**: See README.md for architecture details

## 📝 License

See LICENSE file in repository.
