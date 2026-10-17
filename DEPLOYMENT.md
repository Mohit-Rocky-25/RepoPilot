# RepoPilot — Production Deployment Guide

This guide covers everything needed to deploy **RepoPilot** to production for end-users.

RepoPilot is built with Next.js 14 App Router and is designed for zero-configuration, zero-cost deployment across serverless platforms, container clusters, or self-hosted virtual machines.

---

## Deployment Target Options

| Platform | Recommended For | Cost | Effort |
| :--- | :--- | :--- | :--- |
| **Vercel** | Public web access, zero-maintenance serverless | **$0 / Free** | 1 minute (1 click) |
| **Railway / Render** | Web service with persistent containers | **$0–$5 / mo** | 2 minutes |
| **Docker / Cloud Run** | Scalable containerized cloud environments | **Pay-as-you-go** | 3 minutes |
| **Self-Hosted Linux VM** | Complete data sovereignty & private networks | **Free / VPS** | 5 minutes |

---

## Option 1: Vercel (Recommended — Fastest)

Because RepoPilot is a standard Next.js 14 application, it deploys seamlessly to Vercel without custom build scripts.

### Steps:
1. Go to [https://vercel.com/new](https://vercel.com/new).
2. Log in with your GitHub account.
3. Import your repository: **`Mohit-Rocky-25/RepoPilot`**.
4. Configure Project:
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. *(Optional)* Add Environment Variables:
   - `GITHUB_TOKEN`: Your GitHub Personal Access Token (classic with `public_repo` read access). This provides 5,000 requests/hour for all users of your deployment.
6. Click **Deploy**.
7. **Official Live Production URL:** [https://repo-pilot-git.vercel.app](https://repo-pilot-git.vercel.app)

---

## Option 2: Docker Container Deployment

RepoPilot includes an optimized multi-stage `Dockerfile` based on `node:20-alpine`.

### Build & Run Locally:
```bash
# 1. Build Docker image
docker build -t repopilot:latest .

# 2. Run container on port 3000
docker run -d -p 3000:3000 \
  -e GITHUB_TOKEN=ghp_your_token_here \
  --name repopilot \
  repopilot:latest
```

### Docker Compose Example (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  repopilot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GITHUB_TOKEN=your_token_here
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

---

## Option 3: Self-Hosted Linux Server (Ubuntu / Debian / AlmaLinux)

For deployment on your own VPS (DigitalOcean, Hetzner, AWS EC2, Linode):

### 1. Install Node.js 20 & Git:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2
```

### 2. Clone and Build:
```bash
cd /var/www
git clone https://github.com/Mohit-Rocky-25/RepoPilot.git
cd RepoPilot

# Install dependencies and build
npm ci
npm run build
```

### 3. Run with PM2 (Process Manager):
```bash
pm2 start npm --name "repopilot" -- start
pm2 save
pm2 startup
```

### 4. Configure Nginx Reverse Proxy with HTTPS:
```nginx
server {
    server_name repopilot.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL certificate with Certbot:
```bash
sudo certbot --nginx -d repopilot.yourdomain.com
```

---

## Environment Variables Reference

All environment variables are **optional**. RepoPilot operates out-of-the-box with default ₹0 zero-budget settings.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port the server listens on | `3000` |
| `GITHUB_TOKEN` | Server-wide GitHub token (raises rate limit to 5,000 req/hr) | `undefined` (60 req/hr) |
| `OLLAMA_BASE_URL` | Endpoint for optional local AI inference | `http://localhost:11434` |
| `NEXT_PUBLIC_APP_URL` | Base public URL of the application | `http://localhost:3000` |
| `NODE_ENV` | Runtime environment mode | `production` |

---

## Production Security & Rate-Limit Checklist

Before opening your deployed RepoPilot instance to users:

1. **GitHub API Quotas**:
   - Without a server `GITHUB_TOKEN`, all unauthenticated users share GitHub's 60 req/hr IP limit.
   - Supplying an optional `GITHUB_TOKEN` in the host environment expands the limit to **5,000 requests per hour**.
   - Individual users can also paste their own Personal Access Token under `/settings` in their browser; RepoPilot automatically routes their requests with their individual quota.
2. **SSRF & Sandbox Protections**:
   - RepoPilot strictly blocks non-GitHub URLs, localhost addresses, and internal network ranges.
   - Arbitrary code execution is strictly disabled. Untrusted repository scripts will never run on your server.
3. **Local AI Resilience**:
   - If the server has no local Ollama instance running, the platform operates in 100% offline deterministic mode without errors or downtime.
