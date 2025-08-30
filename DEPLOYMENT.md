# Dokploy Deployment Guide

This guide explains how to deploy your monorepo with separate backend and frontend services using Dokploy with nixpacks.

## Architecture Overview

- **Backend Service**: Next.js API server (`apps/server/`)
- **Frontend Service**: Next.js client application (`apps/web/`)
- **Deploy Strategy**: Two separate Dokploy Applications (not Docker Compose)

## Prerequisites

1. **Dokploy Server**: Installed and running
2. **Domain Names**: Two subdomains configured
   - `api.yourdomain.com` → Backend
   - `app.yourdomain.com` → Frontend (or use root domain)
3. **Git Repository**: Connected to Dokploy (GitHub/GitLab/etc.)

## Deployment Steps

### 1. Create Backend Application

1. **Go to Dokploy Dashboard** → Applications → Create Application
2. **General Settings**:
   - Name: `parti-chat-backend`
   - Repository: `your-repo-url`
   - Branch: `main`
   - Build Path: `/apps/server` ⚠️ **IMPORTANT**
3. **Build Configuration**:
   - Build Type: `Nixpacks`
   - Configuration File: `nixpacks.toml` (auto-detected)
4. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=your_database_url
   NEXTAUTH_URL=https://api.yourdomain.com
   NEXTAUTH_SECRET=your_secret_key
   ```
5. **Domain**:
   - Host: `api.yourdomain.com`
   - Port: `3000`
   - HTTPS: Enabled (with Let's Encrypt)

### 2. Create Frontend Application  

1. **Go to Dokploy Dashboard** → Applications → Create Application
2. **General Settings**:
   - Name: `parti-chat-frontend` 
   - Repository: `your-repo-url`
   - Branch: `main`
   - Build Path: `/apps/web` ⚠️ **IMPORTANT**
3. **Build Configuration**:
   - Build Type: `Nixpacks`
   - Configuration File: `nixpacks.toml` (auto-detected)
4. **Environment Variables**:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```
5. **Domain**:
   - Host: `yourdomain.com` (or `app.yourdomain.com`)
   - Port: `3000`
   - HTTPS: Enabled (with Let's Encrypt)

## Nixpacks Configuration

Both `nixpacks.toml` files are configured to:
- ✅ Use Bun package manager
- ✅ Install dependencies with frozen lockfile
- ✅ Build the application
- ✅ Start with production command
- ✅ Set NODE_ENV=production

## Important Notes

### Build Path Configuration
- **Critical**: Set the correct Build Path for each service:
  - Backend: `/apps/server`
  - Frontend: `/apps/web`
- This tells Dokploy which directory to build from in your monorepo

### Alternative: Environment Variables Approach
Instead of separate `nixpacks.toml` files, you can use environment variables in Dokploy:

**Backend Environment Variables:**
```
NIXPACKS_BUILD_CMD=bun run build
NIXPACKS_START_CMD=bun run start
NIXPACKS_INSTALL_CMD=bun install --frozen-lockfile
```

**Frontend Environment Variables:**
```
NIXPACKS_BUILD_CMD=bun run build  
NIXPACKS_START_CMD=bun run start
NIXPACKS_INSTALL_CMD=bun install --frozen-lockfile
```

### Database Connection
- Set up your database (PostgreSQL) either:
  - As a separate Dokploy service, or
  - External managed database (recommended for production)
- Update `DATABASE_URL` environment variable in backend service

### Automatic Deployments
- Configure webhooks in your Git provider
- Pushes to `main` branch will auto-deploy both services
- Each service deploys independently

## Troubleshooting

### Common Issues

1. **Bad Gateway Error**:
   - Verify the application is listening on `0.0.0.0:3000` (not just `localhost`)
   - Check if the correct port is configured in domain settings

2. **Build Failures**:
   - Ensure Build Path is correctly set (`/apps/server` or `/apps/web`)
   - Check that `bun.lockb` exists in the repository
   - Verify nixpacks.toml syntax

3. **Environment Variables**:
   - Frontend env vars must be prefixed with `NEXT_PUBLIC_` to be accessible
   - Backend database connections need proper connection strings

### Logs and Debugging
- Check deployment logs in Dokploy dashboard
- Monitor application logs for runtime errors
- Use Dokploy's built-in log viewer for each service

## Production Checklist

- [ ] Database is set up and connected
- [ ] Environment variables are configured
- [ ] Domains are pointed to your Dokploy server
- [ ] HTTPS certificates are generated
- [ ] Both services are running and accessible
- [ ] Automatic deployments are configured
- [ ] Monitoring/logging is set up

## Scaling Considerations

- Each service can be scaled independently in Dokploy
- Set replica count in Application settings
- Consider database connection pooling for backend
- Use CDN for frontend static assets if needed