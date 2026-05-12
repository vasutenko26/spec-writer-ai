# ContentForge Quick Start Guide

## 🚀 Deploy on New Server (5 minutes)

### Automatic Deployment
```bash
# 1. Clone repository
git clone https://github.com/vasutenko26/spec-writer-ai.git
cd spec-writer-ai

# 2. Run deployment script
sudo bash deployment/deploy.sh
```

The script will ask for your domain and install everything automatically.

### What Gets Installed
- ✅ Node.js 18+
- ✅ Docker & Docker Compose
- ✅ Caddy web server
- ✅ All npm dependencies
- ✅ SearXNG container
- ✅ Systemd service for API
- ✅ SSL certificates (automatic via Caddy)

### After Installation

1. **Add your API keys** to `.env` files:
```bash
# Backend API keys
nano /opt/spec-writer-ai/server/.env
# Add: GEMINI_API_KEY, JWT_SECRET

# Frontend Supabase config
nano /opt/spec-writer-ai/.env
# Add: VITE_SUPABASE_* credentials
```

2. **Restart services**:
```bash
systemctl restart contentforge-api
```

3. **Point DNS** to your server IP:
```
A Record: @ → your.server.ip
A Record: www → your.server.ip
```

4. **Access your site**:
```
https://yourdomain.com
```

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `README.md` | Full platform documentation (Ukrainian) |
| `DEPLOYMENT.md` | Complete deployment guide (English) |
| `ARCHITECTURE.md` | Technical architecture for developers |
| `QUICK_START.md` | This file - quick deployment |

---

## 🔧 Useful Commands

### Check Services
```bash
# API status
systemctl status contentforge-api
journalctl -u contentforge-api -f

# Caddy status
systemctl status caddy
journalctl -u caddy -f

# SearXNG status
docker ps | grep searxng
```

### Update Code
```bash
cd /opt/spec-writer-ai
git pull origin main
npm run build
cp -r dist/* /var/www/spec-writer-ai/
systemctl restart contentforge-api
```

### Backup Database
```bash
cp /opt/spec-writer-ai/server/db/contentforge.db \
   ~/backup-$(date +%Y%m%d).db
```

---

## 🆘 Troubleshooting

### API not starting
```bash
journalctl -u contentforge-api -n 100
```

### SearXNG not working
```bash
cd /opt/spec-writer-ai
docker-compose -f docker-compose.searxng.yml restart
```

### SSL certificate issues
```bash
sudo systemctl restart caddy
journalctl -u caddy -f
```

---

## 📦 What's Included

### Full Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + SQLite
- **Infra**: Caddy + Systemd + Docker

### All SEO Tools
- SERP Analysis
- Brief Generation
- AI Content Generation
- LSI Analysis
- PageSpeed Audit
- Semantic Clustering
- SEO Checker
- Smart Linking
- Automated Campaign (5-step pipeline)

### Integrations
- Google Gemini AI
- SearXNG (local search)
- Google PageSpeed API
- Google Search Console
- WordPress REST API
- Supabase Auth

---

## 🔑 Required API Keys

| Service | Required | Get From |
|---------|----------|----------|
| Google Gemini | ✅ Yes | https://aistudio.google.com |
| Supabase | ✅ Yes | https://supabase.com |
| PageSpeed | ⚪ Optional | https://console.cloud.google.com |
| Google Search Console | ⚪ Optional | OAuth setup |

---

## 📍 Repository

**GitHub**: https://github.com/vasutenko26/spec-writer-ai

**Live Demo**: https://aiagentlab.fun

---

**Last Updated**: 2025-01-XX
