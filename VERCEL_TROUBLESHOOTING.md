# Vercel Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide addresses common issues that may arise when deploying and running the Phaser habitat game on Vercel. It provides step-by-step solutions, diagnostic procedures, and preventive measures.

## Quick Diagnostic Commands

### Initial Health Check

```bash
# Test local environment
npm run dev
curl http://localhost:8080

# Test build process
npm run build
ls -la dist/

# Validate environment variables
node -e "console.log(Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')))"

# Check Vercel status
vercel ls
vercel logs [deployment-url]
```

### Environment Validation

```bash
# Test external services
curl -I $NEXT_PUBLIC_SUPABASE_URL/rest/v1/
curl -I $NEXT_PUBLIC_TITILER_BASE_URL
curl -I $NEXT_PUBLIC_COG_URL
```

## Build and Deployment Issues

### Issue: Build Fails on Vercel

#### Symptoms
- Build process terminates with errors
- "Command failed with exit code 1" 
- TypeScript compilation errors
- Missing dependencies

#### Common Causes & Solutions

**1. TypeScript Compilation Errors**

```bash
# Error: Type errors during build
Error: Type checking failed with exit code 2

# Solution: Run local type check
npm run typecheck

# Fix common TypeScript issues:
# - Missing type imports
# - Incorrect type definitions
# - Unused variables in strict mode
```

**Example Fix**:
```typescript
// Before (problematic)
import { Species } from '../types/database'

// After (correct)
import type { Species } from '@/types/database'
```

**2. Node.js Version Mismatch**

```json
// Add to package.json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

**3. Cesium Asset Copy Failure**

```bash
# Error: Cannot copy Cesium assets
Error: ENOENT: no such file or directory, open 'node_modules/cesium/Build/Cesium'

# Solution: Check postinstall script
# Ensure scripts/copy-cesium-assets.js exists and is executable
```

**Fix Script Issues**:
```javascript
// scripts/copy-cesium-assets.js - Add error handling
try {
  // ... copy logic
  console.log('✅ Cesium assets copied successfully');
} catch (error) {
  console.error('❌ Cesium copy failed:', error.message);
  console.log('Attempting fallback to symlink...');
  // Fallback to symlink or continue without error
  process.exit(0); // Don't fail the build
}
```

**4. Bundle Size Exceeding Limits**

```bash
# Error: Function size exceeds 250MB limit
Error: The Serverless Function size (XXX MB) exceeds the maximum size (250 MB)

# Solution: Optimize bundle
npm run analyze
```

**Bundle Optimization**:
```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizePackageImports: ['cesium', 'phaser'],
  },
  webpack: (config) => {
    // External large dependencies
    config.externals = config.externals || {};
    if (!config.isServer) {
      config.externals.cesium = 'Cesium';
    }
    return config;
  }
};
```

### Issue: Environment Variables Not Working

#### Symptoms
- Application loads but features don't work
- API requests failing
- Console errors about undefined variables

#### Solutions

**1. Verify Variable Names**

```bash
# ✅ Correct format (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co

# ❌ Incorrect format (server-side only)
SUPABASE_URL=https://project.supabase.co
```

**2. Check Vercel Dashboard Configuration**

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Verify all required variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_TITILER_BASE_URL`
   - `NEXT_PUBLIC_COG_URL`
   - `NEXT_PUBLIC_CESIUM_ION_TOKEN`

**3. Environment Variable Debugging**

```typescript
// Add to your main component for debugging
console.log('Environment Debug:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
  titilerUrl: process.env.NEXT_PUBLIC_TITILER_BASE_URL ? '✅ Set' : '❌ Missing',
  cesiumToken: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ? '✅ Set' : '❌ Missing',
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV
});
```

**4. Force Rebuild After Environment Changes**

```bash
# Trigger new deployment to pick up environment variable changes
git commit --allow-empty -m "Force rebuild for env vars"
git push origin main
```

## Runtime Issues

### Issue: Cesium Globe Not Loading

#### Symptoms
- Black or empty screen where globe should be
- Console errors about Cesium assets
- "CESIUM_BASE_URL is not defined" errors

#### Solutions

**1. Verify Cesium Assets**

```bash
# Check if assets were copied correctly
ls -la dist/cesium/
# Should contain: Workers/, ThirdParty/, Assets/, etc.
```

**2. Fix Asset Path Issues**

```javascript
// next.config.mjs - Ensure correct Cesium configuration
const nextConfig = {
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        'CESIUM_BASE_URL': JSON.stringify('/cesium/')
      })
    );
    return config;
  }
};
```

**3. Check Network Tab for Failed Asset Loads**

```bash
# Common failed requests:
# ❌ 404: /cesium/Cesium.js
# ❌ 404: /cesium/Workers/createTaskProcessorWorker.js

# Solution: Verify asset copying in build logs
vercel logs --follow [deployment-url]
```

**4. Add Cesium Error Handling**

```typescript
// components/CesiumMap.tsx
useEffect(() => {
  if (typeof window !== 'undefined') {
    window.CESIUM_BASE_URL = '/cesium/';
    
    // Add error handling
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('Cesium')) {
        console.warn('Cesium Error (handled):', ...args);
      } else {
        originalError(...args);
      }
    };
  }
}, []);
```

### Issue: Supabase Connection Failing

#### Symptoms
- No species data loading
- Console errors about network requests
- "Failed to fetch" errors

#### Solutions

**1. Test Supabase Connectivity**

```bash
# Test basic connectivity
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/icaa?select=ogc_fid&limit=1"
```

**2. Check CORS Configuration**

```sql
-- In Supabase SQL Editor, verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'icaa';

-- Ensure anon role has access
GRANT SELECT ON icaa TO anon;
```

**3. Debug Supabase Client Configuration**

```typescript
// lib/supabaseClient.ts - Add debugging
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Supabase Config:', {
  url: supabaseUrl ? '✅ Set' : '❌ Missing',
  key: supabaseKey ? '✅ Set' : '❌ Missing'
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // Important for static export
  }
});

// Test connection
supabase.from('icaa').select('count').limit(1).then(result => {
  console.log('Supabase test query:', result);
}).catch(error => {
  console.error('Supabase connection failed:', error);
});
```

**4. Network Request Debugging**

```typescript
// Add to species service for debugging
export const speciesService = {
  async getSpeciesAtPoint(longitude: number, latitude: number) {
    console.log('🔍 Querying species at:', { longitude, latitude });
    
    try {
      const { data, error } = await supabase
        .rpc('get_species_at_point', { lon: longitude, lat: latitude });
      
      console.log('📊 Species query result:', { 
        success: !error, 
        count: data?.length || 0,
        error: error?.message 
      });
      
      return { species: data || [], count: data?.length || 0 };
    } catch (err) {
      console.error('❌ Species query failed:', err);
      return { species: [], count: 0 };
    }
  }
};
```

### Issue: TiTiler/Habitat Tiles Not Loading

#### Symptoms
- Habitat overlay not visible on globe
- Console errors about tile requests
- CORS errors for TiTiler requests

#### Solutions

**1. Test TiTiler Service**

```bash
# Test TiTiler endpoint
curl -I $NEXT_PUBLIC_TITILER_BASE_URL

# Test specific tile request
curl -I "$NEXT_PUBLIC_TITILER_BASE_URL/cog/tiles/1/0/0?url=$NEXT_PUBLIC_COG_URL"
```

**2. Check CORS Configuration**

```javascript
// If TiTiler has CORS issues, you may need to configure headers
// Contact TiTiler service administrator to add your Vercel domain:
// - https://your-app.vercel.app
// - https://your-custom-domain.com
```

**3. Debug Tile Loading**

```typescript
// components/CesiumMap.tsx - Add tile loading debugging
const setupImagery = useCallback(async () => {
  console.log('🗺 Setting up TiTiler imagery...');
  
  try {
    const tileUrl = `${TITILER_BASE_URL}/cog/tiles/{z}/{x}/{y}?url=${encodeURIComponent(COG_URL)}`;
    console.log('Tile URL template:', tileUrl);
    
    const provider = new UrlTemplateImageryProvider({
      url: tileUrl,
      // Add error handling
      errorEvent: {
        addEventListener: (callback) => {
          console.error('TiTiler tile loading error:', callback);
        }
      }
    });
    
    setImageryProvider(provider);
  } catch (error) {
    console.error('❌ TiTiler setup failed:', error);
  }
}, []);
```

### Issue: Phaser Game Not Starting

#### Symptoms
- Game area remains blank
- No Phaser canvas element created
- Console errors about Phaser initialization

#### Solutions

**1. Check Phaser Initialization**

```typescript
// PhaserGame.tsx - Add initialization debugging
useEffect(() => {
  console.log('🎮 Initializing Phaser game...');
  
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: parentId,
    backgroundColor: '#028af8',
    scene: [Boot, Preloader, MainMenu, Game, GameOver]
  };
  
  try {
    const game = new Phaser.Game(config);
    gameRef.current = { game, scene: null };
    console.log('✅ Phaser game initialized');
  } catch (error) {
    console.error('❌ Phaser initialization failed:', error);
  }
}, [parentId]);
```

**2. Asset Loading Issues**

```typescript
// game/scenes/Preloader.ts - Debug asset loading
preload() {
  console.log('📦 Loading game assets...');
  
  // Add load progress tracking
  this.load.on('progress', (value) => {
    console.log('Loading progress:', Math.round(value * 100) + '%');
  });
  
  this.load.on('complete', () => {
    console.log('✅ All assets loaded');
  });
  
  this.load.on('loaderror', (file) => {
    console.error('❌ Failed to load asset:', file.key);
  });
  
  // Load assets...
}
```

## Performance Issues

### Issue: Slow Page Load Times

#### Symptoms
- Long initial load times (>5 seconds)
- Poor Core Web Vitals scores
- Timeout errors

#### Solutions

**1. Bundle Analysis**

```bash
# Analyze bundle size
ANALYZE=true npm run build

# Check specific chunks
ls -lah dist/_next/static/chunks/
```

**2. Optimize Asset Loading**

```javascript
// next.config.mjs - Add performance optimizations
const nextConfig = {
  // ... existing config
  compress: true,
  generateEtags: true,
  
  // Optimize images
  images: {
    unoptimized: true, // Required for static export
    formats: ['image/webp', 'image/avif']
  },
  
  // Add resource hints
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Link',
            value: '</cesium/Cesium.js>; rel=preload; as=script'
          }
        ]
      }
    ];
  }
};
```

**3. Lazy Loading Implementation**

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const CesiumMap = dynamic(() => import('./components/CesiumMap'), {
  ssr: false,
  loading: () => <div>Loading 3D Globe...</div>
});

const PhaserGame = dynamic(() => import('./PhaserGame'), {
  ssr: false,
  loading: () => <div>Loading Game...</div>
});
```

### Issue: Memory Leaks During Gameplay

#### Symptoms
- Browser becomes sluggish over time
- Increasing memory usage
- Game performance degrades

#### Solutions

**1. Proper Cleanup in React Components**

```typescript
// components/CesiumMap.tsx
useEffect(() => {
  // Setup code...
  
  return () => {
    // Cleanup Cesium viewer
    if (viewerRef.current?.cesiumElement) {
      viewerRef.current.cesiumElement.destroy();
    }
    
    // Remove event listeners
    EventBus.off('cesium-location-selected', handleLocationSelected);
  };
}, []);
```

**2. Phaser Memory Management**

```typescript
// PhaserGame.tsx
useEffect(() => {
  return () => {
    if (gameRef.current?.game) {
      console.log('🧹 Cleaning up Phaser game...');
      gameRef.current.game.destroy(true);
      gameRef.current = null;
    }
  };
}, []);
```

**3. EventBus Cleanup**

```typescript
// game/EventBus.ts - Add cleanup utilities
export class TypedEventBus extends Phaser.Events.EventEmitter {
  cleanup() {
    this.removeAllListeners();
    console.log('🧹 EventBus cleaned up');
  }
}

// Use in components
useEffect(() => {
  return () => {
    EventBus.cleanup();
  };
}, []);
```

## Deployment and Platform Issues

### Issue: Deployment Stuck or Failing

#### Symptoms
- Deployment hangs at "Building..."
- "Function timeout" errors
- Random deployment failures

#### Solutions

**1. Check Build Timeout**

```json
// vercel.json - Increase timeout if needed
{
  "build": {
    "env": {
      "NODE_OPTIONS": "--max-old-space-size=4096"
    }
  },
  "functions": {
    "app/api/**/*.{js,ts}": {
      "maxDuration": 30
    }
  }
}
```

**2. Optimize Build Process**

```json
// package.json - Streamline build
{
  "scripts": {
    "vercel-build": "npm run typecheck && next build",
    "build-fast": "next build --no-lint", // For testing only
  }
}
```

**3. Clear Vercel Cache**

```bash
# Force fresh build
vercel build --force

# Or add cache-busting to package.json
npm version patch
git push origin main
```

### Issue: Function Size Limits

#### Symptoms
- "Function size exceeds limit" errors
- Deployment fails at packaging stage

#### Solutions

**1. Enable Output File Tracing**

```javascript
// next.config.mjs
const nextConfig = {
  output: 'export', // This helps with size
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  }
};
```

**2. Exclude Large Files**

```javascript
// vercel.json
{
  "functions": {
    "pages/api/**/*.{js,ts}": {
      "excludeFiles": "node_modules/cesium/**"
    }
  }
}
```

## Network and Connectivity Issues

### Issue: CORS Errors

#### Symptoms
- "Access to fetch blocked by CORS policy"
- Network requests failing from browser

#### Solutions

**1. TiTiler CORS Configuration**

Contact your TiTiler service administrator to add Vercel domains to the CORS allowlist:

```
Allowed Origins:
- https://your-app.vercel.app
- https://your-app-*.vercel.app (for preview deployments)
- https://your-custom-domain.com
```

**2. Supabase CORS (usually automatic)**

```sql
-- Verify CORS settings in Supabase dashboard
-- Auth → Settings → CORS
-- Should include your Vercel domains
```

**3. Add CORS Headers to Responses**

```javascript
// For any custom API routes
export default function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Your API logic
}
```

### Issue: SSL/HTTPS Problems

#### Symptoms
- Mixed content warnings
- "ERR_SSL_PROTOCOL_ERROR"
- Insecure request blocked

#### Solutions

**1. Ensure All URLs Use HTTPS**

```bash
# ✅ Correct
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_TITILER_BASE_URL=https://titiler-service.com

# ❌ Incorrect
NEXT_PUBLIC_SUPABASE_URL=http://project.supabase.co
```

**2. Force HTTPS Redirects**

```javascript
// next.config.mjs
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/(.*)',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://your-domain.com/:path*',
        permanent: true,
      },
    ];
  },
};
```

## Monitoring and Debugging Tools

### Performance Monitoring

```typescript
// utils/performance-monitor.ts
export class PerformanceMonitor {
  static trackPageLoad() {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        console.log('📊 Page Performance:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        });
      });
    }
  }
  
  static trackCustomMetric(name: string, startTime: number) {
    const endTime = performance.now();
    console.log(`⏱ ${name}: ${(endTime - startTime).toFixed(2)}ms`);
  }
}
```

### Error Tracking

```typescript
// utils/error-tracker.ts
export class ErrorTracker {
  static initialize() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        console.error('❌ Global Error:', {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ Unhandled Promise Rejection:', {
          reason: event.reason,
          promise: event.promise
        });
      });
    }
  }
}
```

## Emergency Procedures

### Quick Rollback

```bash
# Emergency rollback to previous working deployment
vercel ls
vercel alias https://previous-working-deployment.vercel.app your-domain.com

# Or via dashboard:
# 1. Go to Vercel Dashboard → Deployments
# 2. Find last working deployment
# 3. Click "Promote to Production"
```

### Service Degradation Response

```typescript
// Implement graceful degradation
export function getServiceConfig() {
  const env = getEnvironmentConfig();
  
  return {
    // Fallback configurations
    enableCesium: true, // Set to false if Cesium fails
    enableTiTiler: true, // Set to false if TiTiler fails
    enableRasterHabitats: true, // Fallback to species-based habitats
    
    // Retry configurations
    maxRetries: env.isProduction ? 1 : 3,
    retryDelay: env.isProduction ? 1000 : 3000
  };
}
```

### Support Resources

#### Vercel Support
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Support](https://vercel.com/support)

#### Next.js Support
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js GitHub Issues](https://github.com/vercel/next.js/issues)
- [Next.js Discord](https://nextjs.org/discord)

#### Application-Specific Support
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Cesium**: [cesium.com/docs](https://cesium.com/docs)
- **Phaser**: [phaser.io/learn](https://phaser.io/learn)

This troubleshooting guide should help resolve most common issues encountered during Vercel deployment and operation of the Phaser habitat game.