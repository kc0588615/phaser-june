# Vercel Deployment Guide: Step-by-Step Instructions

## Overview

This guide provides detailed, step-by-step instructions for deploying the Phaser habitat game to Vercel. Follow these instructions in order to ensure a successful migration from local development to cloud deployment.

## Prerequisites

### Required Accounts and Access
- [ ] **GitHub Account**: Repository access for automatic deployments
- [ ] **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
- [ ] **Supabase Access**: Existing project credentials
- [ ] **Azure TiTiler Access**: Current endpoint access maintained

### Local Development Requirements
- [ ] **Node.js**: Version 18+ (compatible with Vercel)
- [ ] **npm/yarn**: Package manager
- [ ] **Git**: Version control
- [ ] **Vercel CLI**: Install with `npm i -g vercel`

## Phase 1: Pre-Deployment Preparation

### Step 1.1: Install Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Verify installation
vercel --version

# Login to Vercel account
vercel login
```

### Step 1.2: Backup Current Configuration
```bash
# Create backup of current working state
cp package.json package.json.backup
cp next.config.mjs next.config.mjs.backup
cp .env.local .env.local.backup

# Commit current state to git
git add -A
git commit -m "Pre-Vercel migration backup"
```

### Step 1.3: Update Package.json Scripts
**Current Scripts (problematic for Vercel)**:
```json
{
  "scripts": {
    "dev": "node log.js dev & next dev -p 8080",
    "build": "node log.js build & npm run typecheck && next build",
    "serve": "npx serve dist -p 8080 -s",
    "start": "npm run build && npm run serve"
  }
}
```

**Updated Scripts (Vercel-compatible)**:
```json
{
  "scripts": {
    "dev": "next dev -p 8080",
    "dev-local": "node log.js dev & next dev -p 8080",
    "build": "npm run typecheck && next build",
    "build-local": "node log.js build & npm run typecheck && next build",
    "serve": "npx serve dist -p 8080 -s",
    "start": "npm run build && npm run serve",
    "vercel-build": "npm run typecheck && next build",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "postinstall": "node scripts/copy-cesium-assets.js || symlink-dir node_modules/cesium/Build/Cesium public/cesium"
  }
}
```

### Step 1.4: Create Cesium Asset Copy Script
**Create `scripts/copy-cesium-assets.js`**:
```javascript
const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  const cesiumSource = path.join(__dirname, '../node_modules/cesium/Build/Cesium');
  const cesiumDest = path.join(__dirname, '../public/cesium');
  
  console.log('Copying Cesium assets...');
  copyRecursiveSync(cesiumSource, cesiumDest);
  console.log('Cesium assets copied successfully');
} catch (error) {
  console.warn('Failed to copy Cesium assets:', error.message);
  console.log('Falling back to symlink strategy');
  process.exit(1); // Let package.json fallback to symlink
}
```

### Step 1.5: Update Node.js Version Specification
**Add to package.json**:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

## Phase 2: Vercel Configuration

### Step 2.1: Create Vercel Configuration File
**Create `vercel.json`**:
```json
{
  "version": 2,
  "name": "phaser-habitat-game",
  "build": {
    "env": {
      "NODE_VERSION": "18"
    }
  },
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["cle1"],
  "functions": {},
  "headers": [
    {
      "source": "/cesium/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control", 
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api|_next|cesium|assets).*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 2.2: Optimize Next.js Configuration
**Update `next.config.mjs`**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Static export for Vercel
    output: 'export',
    distDir: 'dist',
    trailingSlash: false,
    images: {
        unoptimized: true // Required for static export
    },
    // Add webpack configuration
    webpack: (config, { webpack, isServer }) => {
        config.plugins.push(
            new webpack.DefinePlugin({
                'CESIUM_BASE_URL': JSON.stringify('/cesium/')
            })
        );
        
        // Optimize for Vercel
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
            };
        }
        
        return config;
    },
    // Environment variable configuration
    env: {
        VERCEL_ENV: process.env.VERCEL_ENV,
    }
};

export default nextConfig;
```

### Step 2.3: Create Environment Variables Template
**Create `.env.example`**:
```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# TiTiler Configuration (Required)
NEXT_PUBLIC_TITILER_BASE_URL=https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net
NEXT_PUBLIC_COG_URL=https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif

# Cesium Configuration (Required)
NEXT_PUBLIC_CESIUM_ION_TOKEN=your_cesium_token_here

# Optional Configuration
NEXT_PUBLIC_GAME_API_BASE_URL=https://your-api-endpoint.com

# Development Only (not needed on Vercel)
NODE_ENV=development
```

## Phase 3: GitHub Integration Setup

### Step 3.1: Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"

# Push to GitHub (if not already done)
git push origin main
```

### Step 3.2: Connect Repository to Vercel
1. **Go to Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Click "New Project"**
3. **Import Git Repository**: Select your GitHub repository
4. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3.3: Configure Environment Variables in Vercel
**Navigate to**: Project Settings > Environment Variables

**Add the following variables**:
```bash
# Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://abhhfiazxykwcpkyvavk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your_actual_key]
NEXT_PUBLIC_TITILER_BASE_URL=https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net
NEXT_PUBLIC_COG_URL=https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif
NEXT_PUBLIC_CESIUM_ION_TOKEN=[your_actual_token]
```

**Environment Settings**:
- **Production**: Add all variables
- **Preview**: Same as production (for testing)
- **Development**: Optional (use local .env.local)

## Phase 4: Initial Deployment

### Step 4.1: Deploy via Vercel Dashboard
1. **Trigger Deployment**: Click "Deploy" in Vercel dashboard
2. **Monitor Build Process**: Watch build logs for errors
3. **Expected Build Time**: 2-5 minutes
4. **Build Success Indicators**:
   - ✅ Install dependencies
   - ✅ Build application  
   - ✅ Export static files
   - ✅ Deploy to CDN

### Step 4.2: Alternative: Deploy via CLI
```bash
# From project root directory
vercel

# Follow prompts:
# ? Set up and deploy "~/path/to/project"? [Y/n] y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] n
# ? What's your project's name? phaser-habitat-game
# ? In which directory is your code located? ./

# For production deployment
vercel --prod
```

### Step 4.3: Verify Deployment Success
**Check Deployment URL**: Vercel will provide a URL like `https://phaser-habitat-game-xyz.vercel.app`

**Initial Verification Steps**:
1. **Page Load**: Verify the main page loads without errors
2. **Console Check**: Open browser console, check for errors
3. **Network Tab**: Verify all assets load correctly
4. **Basic Interaction**: Try clicking on the Cesium globe

## Phase 5: Comprehensive Testing

### Step 5.1: Functionality Testing Checklist
```markdown
Core Functionality:
- [ ] Application loads without errors
- [ ] Cesium globe renders correctly
- [ ] TiTiler habitat overlay displays
- [ ] Map click triggers location queries
- [ ] Supabase connectivity works
- [ ] Species data loads correctly
- [ ] Phaser game initializes
- [ ] Game mechanics work (gem matching)
- [ ] Clue system functions correctly
- [ ] Green gem shows raster habitat data
- [ ] Info window displays habitat percentages
- [ ] Species progression works
- [ ] All static assets load (images, sounds)

Performance Testing:
- [ ] Page load time < 3 seconds
- [ ] First Contentful Paint < 1.5 seconds
- [ ] No memory leaks during gameplay
- [ ] Smooth animations and interactions
- [ ] Responsive design works on mobile

Cross-Browser Testing:
- [ ] Chrome (latest)
- [ ] Firefox (latest) 
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
```

### Step 5.2: Performance Monitoring
**Access Vercel Analytics**:
1. Go to Project Dashboard > Analytics
2. Monitor Core Web Vitals:
   - **LCP (Largest Contentful Paint)**: Target < 2.5s
   - **FID (First Input Delay)**: Target < 100ms
   - **CLS (Cumulative Layout Shift)**: Target < 0.1

**Bundle Analysis**:
```bash
# Run locally to analyze bundle size
npm install --save-dev @next/bundle-analyzer

# Add to next.config.mjs
ANALYZE=true npm run build
```

### Step 5.3: Error Monitoring Setup
**Configure Error Tracking**:
1. **Vercel Runtime Logs**: Monitor in Vercel dashboard
2. **Browser Console**: Check for client-side errors
3. **Network Errors**: Monitor failed API requests
4. **Performance Issues**: Track slow-loading resources

## Phase 6: Production Optimization

### Step 6.1: Custom Domain Setup (Optional)
**If using custom domain**:
1. **Vercel Dashboard**: Go to Project Settings > Domains
2. **Add Domain**: Enter your custom domain
3. **DNS Configuration**: Update DNS records as instructed
4. **SSL Certificate**: Vercel automatically provisions SSL

### Step 6.2: Performance Optimizations
**Immediate Optimizations**:
```javascript
// In next.config.mjs, add:
const nextConfig = {
    // ... existing config
    compress: true,
    poweredByHeader: false,
    generateEtags: true,
    
    // Optimize images
    images: {
        formats: ['image/webp', 'image/avif'],
        unoptimized: true // Required for static export
    },
    
    // Optimize headers
    headers: async () => [
        {
            source: '/(.*)',
            headers: [
                {
                    key: 'X-Frame-Options',
                    value: 'DENY'
                },
                {
                    key: 'X-Content-Type-Options', 
                    value: 'nosniff'
                }
            ]
        }
    ]
};
```

### Step 6.3: Monitoring and Alerts
**Set up monitoring for**:
- **Deployment Status**: Failed builds
- **Performance Degradation**: Slow page loads
- **Error Rates**: Increased error frequency
- **Traffic Patterns**: Usage analytics

## Phase 7: Final Validation and Go-Live

### Step 7.1: User Acceptance Testing
**Test Scenarios**:
1. **New User Flow**: Complete first-time user experience
2. **Game Completion**: Play through complete game session
3. **Multiple Locations**: Test different geographic locations
4. **Extended Session**: Play for 15+ minutes continuously
5. **Mobile Experience**: Test on actual mobile devices

### Step 7.2: Performance Validation
**Acceptable Performance Thresholds**:
- **Time to Interactive**: < 3 seconds
- **Build Time**: < 5 minutes
- **Error Rate**: < 1%
- **Uptime**: > 99.9%

### Step 7.3: Go-Live Checklist
```markdown
Pre-Launch Checklist:
- [ ] All functionality tested and working
- [ ] Performance meets requirements
- [ ] Error monitoring configured
- [ ] Backup/rollback plan documented
- [ ] Team access configured
- [ ] Documentation updated
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Analytics tracking working

Post-Launch Monitoring:
- [ ] Monitor first 24 hours closely
- [ ] Check error logs regularly
- [ ] Validate performance metrics
- [ ] Gather user feedback
- [ ] Document any issues found
```

## Rollback Procedures

### Emergency Rollback
**If critical issues are discovered**:
1. **Vercel Dashboard**: Go to Deployments
2. **Select Previous Deployment**: Choose last working version
3. **Promote to Production**: Click "Promote to Production"
4. **Verify Rollback**: Test functionality immediately

### Local Development Fallback
**If Vercel deployment fails completely**:
```bash
# Restore original configuration
cp package.json.backup package.json
cp next.config.mjs.backup next.config.mjs

# Continue with local development
npm run dev-local
```

## Post-Deployment Maintenance

### Regular Tasks
- **Weekly**: Monitor performance metrics
- **Monthly**: Review error logs and optimize
- **Quarterly**: Update dependencies and security patches

### Updating the Application
```bash
# For future updates
git add .
git commit -m "Feature update"
git push origin main
# Vercel automatically deploys from main branch
```

### Scaling Considerations
- **Traffic Monitoring**: Watch for usage patterns
- **Performance Optimization**: Continuous improvement
- **Cost Management**: Monitor Vercel usage and billing

## Support and Resources

### Vercel Documentation
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/concepts/projects/custom-domains)

### Troubleshooting Resources
- **Vercel Community**: [vercel.com/community](https://vercel.com/community)
- **Next.js Discord**: [nextjs.org/discord](https://nextjs.org/discord)
- **Project Documentation**: See `VERCEL_TROUBLESHOOTING.md`

## Conclusion

Following this guide should result in a successful deployment of the Phaser habitat game to Vercel. The application will benefit from Vercel's global CDN, automatic deployments, and excellent Next.js optimization.

**Key Success Indicators**:
- ✅ Application fully functional on Vercel
- ✅ All game mechanics working correctly
- ✅ Performance within acceptable ranges
- ✅ Automatic deployments from GitHub
- ✅ Environment variables properly configured
- ✅ Error monitoring and rollback procedures in place

**Next Steps**: Monitor the application closely for the first 24-48 hours and make any necessary optimizations based on real-world usage patterns.