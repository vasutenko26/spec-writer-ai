#!/bin/bash

# ContentForge Deployment Script
# This script automates the deployment of ContentForge on a fresh server

set -e  # Exit on error

echo "======================================"
echo "  ContentForge Deployment Script"
echo "======================================"
echo ""

# Configuration
INSTALL_DIR="/opt/spec-writer-ai"
WEB_DIR="/var/www/spec-writer-ai"
DOMAIN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root (use sudo)"
    exit 1
fi

# Ask for domain
read -p "Enter your domain (e.g., aiagentlab.fun): " DOMAIN
if [ -z "$DOMAIN" ]; then
    error "Domain is required"
    exit 1
fi

info "Starting deployment for domain: $DOMAIN"

# Step 1: Update system
info "Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install dependencies
info "Installing required packages..."
apt install -y curl git nodejs npm docker.io docker-compose build-essential

# Install Caddy
info "Installing Caddy web server..."
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy

# Step 3: Clone repository
info "Cloning ContentForge repository..."
if [ -d "$INSTALL_DIR" ]; then
    warn "Directory $INSTALL_DIR already exists. Removing..."
    rm -rf "$INSTALL_DIR"
fi
git clone https://github.com/vasutenko26/spec-writer-ai.git "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Step 4: Setup frontend
info "Installing frontend dependencies..."
npm install

# Step 5: Setup backend
info "Installing backend dependencies..."
cd server
npm install
cd ..

# Step 6: Setup environment files
info "Setting up environment files..."
if [ ! -f "server/.env" ]; then
    warn "server/.env not found. Creating from example..."
    cp server/.env.example server/.env
    warn "Please edit server/.env with your API keys:"
    echo "  - GEMINI_API_KEY (required)"
    echo "  - PAGESPEED_API_KEY (optional)"
    echo "  - JWT_SECRET (generate random string)"
fi

if [ ! -f ".env" ]; then
    warn ".env not found. Creating from example..."
    cp .env.example .env
    warn "Please edit .env with your Supabase credentials"
fi

# Step 7: Build frontend
info "Building frontend..."
npm run build

# Step 8: Setup web directory
info "Setting up web directory..."
mkdir -p "$WEB_DIR"
cp -r dist/* "$WEB_DIR/"

# Step 9: Setup SearXNG
info "Starting SearXNG container..."
docker-compose -f docker-compose.searxng.yml up -d

# Step 10: Setup systemd service
info "Setting up systemd service..."
sed -i "s|/opt/spec-writer-ai|$INSTALL_DIR|g" deployment/contentforge-api.service
cp deployment/contentforge-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable contentforge-api
systemctl start contentforge-api

# Step 11: Setup Caddy
info "Configuring Caddy..."
sed -i "s|yourdomain.com|$DOMAIN|g" deployment/Caddyfile.example
cp deployment/Caddyfile.example /etc/caddy/Caddyfile
systemctl restart caddy

# Step 12: Check services
info "Checking service status..."
systemctl status contentforge-api --no-pager || warn "API service failed to start"
systemctl status caddy --no-pager || warn "Caddy failed to start"
docker ps | grep searxng || warn "SearXNG container not running"

echo ""
info "======================================"
info "  Deployment Complete!"
info "======================================"
echo ""
info "Next steps:"
echo "  1. Edit $INSTALL_DIR/server/.env with your API keys"
echo "  2. Edit $INSTALL_DIR/.env with your Supabase credentials"
echo "  3. Restart API: systemctl restart contentforge-api"
echo "  4. Point your domain DNS to this server IP"
echo "  5. Access your site at https://$DOMAIN"
echo ""
info "Useful commands:"
echo "  - Check API logs: journalctl -u contentforge-api -f"
echo "  - Check Caddy logs: journalctl -u caddy -f"
echo "  - Restart services: systemctl restart contentforge-api caddy"
echo "  - Check SearXNG: docker-compose -f $INSTALL_DIR/docker-compose.searxng.yml ps"
echo ""
