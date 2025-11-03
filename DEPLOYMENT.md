# Deployment Guide

## Vercel Deployment

This project is optimized for deployment on Vercel.

### Prerequisites

1. A Vercel account (https://vercel.com)
2. A Google Gemini API key (https://aistudio.google.com/app/apikey)
3. A VRM model file (e.g., AliciaSolid.vrm)

### Step-by-Step Deployment

#### 1. Prepare Your Repository

```bash
# Clone or initialize repository
git init
git add .
git commit -m "Initial commit: Daxon VRM Body Control"

# Push to GitHub/GitLab/Bitbucket
git remote add origin <your-repo-url>
git push -u origin main
```

#### 2. Add VRM Model

Before deploying, add your VRM model:

```bash
# Place your VRM file in the public directory
cp /path/to/AliciaSolid.vrm public/models/AliciaSolid.vrm

# Commit the model (or use Git LFS for large files)
git add public/models/AliciaSolid.vrm
git commit -m "Add VRM model"
git push
```

**Note**: For models > 50MB, consider using:
- Git LFS (Large File Storage)
- Vercel Blob storage
- External CDN

#### 3. Deploy to Vercel

**Option A: Vercel Dashboard**

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure project:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Add environment variable:
   - Name: `GEMINI_API_KEY`
   - Value: `your_api_key_here`
5. Click "Deploy"

**Option B: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts and set environment variables
vercel env add GEMINI_API_KEY
```

#### 4. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `GEMINI_API_KEY` | Your API key | Production, Preview, Development |

#### 5. Verify Deployment

1. Visit your deployment URL (e.g., `your-project.vercel.app`)
2. Check that the VRM model loads
3. Test motion commands
4. Monitor Vercel logs for errors

### Optimization for Production

#### 1. Optimize VRM Model

```bash
# Reduce model size for faster loading
# - Use compressed textures
# - Reduce polygon count
# - Optimize bone hierarchy
```

#### 2. Configure Next.js

Update `next.config.js` if needed:

```javascript
module.exports = {
  // Enable static optimization
  output: 'standalone',

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Configure headers for better caching
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

#### 3. Monitor Performance

- Use Vercel Analytics
- Monitor API usage (Google AI Studio dashboard)
- Check Core Web Vitals
- Test on various devices

### Troubleshooting

#### Model Not Loading

```
Error: Failed to load VRM model
```

**Solutions:**
- Verify file path: `/public/models/AliciaSolid.vrm`
- Check file size (< 100MB for Vercel)
- Ensure VRM format is valid
- Check Vercel deployment logs

#### API Errors

```
Error: AI service not configured
```

**Solutions:**
- Verify `GEMINI_API_KEY` is set
- Check API key is valid
- Review Google AI Studio API quota
- Check Vercel function logs

#### Build Failures

```
Error: Module not found
```

**Solutions:**
- Run `npm install` locally
- Check `package.json` dependencies
- Clear `.next` cache
- Redeploy with clean build

### Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning

### Scaling Considerations

#### For High Traffic

1. **Use Vercel Pro/Enterprise**
   - Increased function execution time
   - Higher bandwidth limits
   - Better DDoS protection

2. **Optimize API Calls**
   - Cache motion DSL responses
   - Implement rate limiting
   - Use edge functions

3. **CDN for Assets**
   - Host VRM models on CDN
   - Use Vercel Edge Network
   - Enable compression

#### Cost Optimization

- Monitor Vercel usage dashboard
- Set up billing alerts
- Optimize function execution time
- Cache API responses
- Consider serverless quotas

### Alternative Deployments

#### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

#### Self-Hosted (Docker)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t daxon-vrm .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key daxon-vrm
```

### Security Best Practices

1. **Environment Variables**
   - Never commit `.env.local`
   - Rotate API keys regularly
   - Use Vercel environment encryption

2. **API Protection**
   - Implement rate limiting
   - Add request validation
   - Monitor for abuse

3. **Content Security**
   - Set CSP headers
   - Enable CORS properly
   - Validate user inputs

### Monitoring & Logs

```bash
# View deployment logs
vercel logs

# Monitor in real-time
vercel logs --follow

# Check specific deployment
vercel logs <deployment-url>
```

### Rollback

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

## Support

For issues:
- Check Vercel docs: https://vercel.com/docs
- Review Google AI docs: https://ai.google.dev/docs
- Open GitHub issue in this repo
