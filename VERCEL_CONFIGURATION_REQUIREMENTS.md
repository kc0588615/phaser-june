# Vercel Configuration Requirements: Technical Specifications

## Overview

This document provides detailed technical specifications for all configuration changes required to deploy the Phaser habitat game to Vercel. It includes exact file contents, configuration options, and technical implementation details.

## File Modifications Required

### 1. Package.json Updates

#### Current vs Required Changes

**Current `package.json` (problematic)**:
```json
{
  "name": "template-nextjs",
  "version": "1.2.0",
  "scripts": {
    "dev": "node log.js dev & next dev -p 8080",
    "build": "node log.js build & npm run typecheck && next build",
    "serve": "npx serve dist -p 8080 -s",
    "start": "npm run build && npm run serve",
    "dev-nolog": "next dev -p 8080",
    "build-nolog": "npm run typecheck && next build",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "postinstall": "symlink-dir node_modules/cesium/Build/Cesium public/cesium"
  }
}
```

**Updated `package.json` (Vercel-compatible)**:
```json
{
  "name": "template-nextjs",
  "version": "1.2.0",
  "description": "A Phaser 3 Next.js project template with Cesium integration and Supabase backend",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/phaser-habitat-game.git"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "scripts": {
    "dev": "next dev -p 8080",
    "dev-local": "node log.js dev & next dev -p 8080",
    "build": "npm run typecheck && next build",
    "build-local": "node log.js build & npm run typecheck && next build",
    "vercel-build": "npm run typecheck && next build",
    "serve": "npx serve dist -p 8080 -s",
    "start": "npm run build && npm run serve",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "postinstall": "node scripts/copy-cesium-assets.js || symlink-dir node_modules/cesium/Build/Cesium public/cesium",
    "analyze": "ANALYZE=true npm run build",
    "clean": "rm -rf .next dist public/cesium"
  },
  "dependencies": {
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.10",
    "cesium": "^1.117.0",
    "next": "15.3.1",
    "phaser": "^3.90.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "resium": "^1.17.2"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^15.3.1",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "symlink-dir": "^5.2.1",
    "typescript": "^5",
    "webpack": "^5.99.9"
  }
}
```

**Key Changes Explained**:
- **engines**: Specifies Node.js 18+ for Vercel compatibility
- **vercel-build**: Clean build script without analytics logging
- **postinstall**: Fallback strategy for Cesium assets
- **analyze**: Bundle analysis capability
- **clean**: Cleanup script for development

### 2. Next.js Configuration

#### Updated `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Static export configuration for Vercel
    output: 'export',
    distDir: 'dist',
    trailingSlash: false,
    
    // Image optimization (required for static export)
    images: {
        unoptimized: true,
        domains: ['azurecog.blob.core.windows.net']
    },
    
    // Experimental features for performance
    experimental: {
        optimizePackageImports: ['cesium', 'phaser']
    },
    
    // Security headers
    poweredByHeader: false,
    
    // Webpack configuration
    webpack: (config, { webpack, isServer, dev }) => {
        // Define global Cesium variable
        config.plugins.push(
            new webpack.DefinePlugin({
                'CESIUM_BASE_URL': JSON.stringify('/cesium/')
            })
        );
        
        // Client-side optimizations
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
                stream: false,
                buffer: false,
                process: false
            };
        }
        
        // Production optimizations
        if (!dev) {
            config.optimization = {
                ...config.optimization,
                usedExports: true,
                sideEffects: false
            };
        }
        
        // Bundle analysis
        if (process.env.ANALYZE === 'true') {
            const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
            config.plugins.push(
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    openAnalyzer: false,
                    reportFilename: './analyze/client.html'
                })
            );
        }
        
        return config;
    },
    
    // Environment variables
    env: {
        VERCEL_ENV: process.env.VERCEL_ENV,
        NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL
    },
    
    // Compression and optimization
    compress: true,
    generateEtags: true,
    
    // Headers for security and performance
    async headers() {
        return [
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
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    }
                ]
            },
            {
                source: '/cesium/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable'
                    }
                ]
            },
            {
                source: '/assets/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable'
                    }
                ]
            }
        ];
    },
    
    // Redirects for SPA behavior
    async rewrites() {
        return [
            {
                source: '/((?!api|_next|cesium|assets|favicon.ico).*)',
                destination: '/index.html'
            }
        ];
    }
};

export default nextConfig;
```

**Configuration Breakdown**:
- **Static Export**: Configured for Vercel deployment
- **Image Optimization**: Disabled for static export compatibility
- **Webpack Optimizations**: Fallbacks and performance improvements
- **Security Headers**: Standard security configurations
- **Caching**: Optimized cache headers for static assets
- **Bundle Analysis**: Optional webpack-bundle-analyzer integration

### 3. Vercel Platform Configuration

#### `vercel.json` Configuration

```json
{
  "version": 2,
  "name": "phaser-habitat-game",
  "build": {
    "env": {
      "NODE_VERSION": "18",
      "NPM_CONFIG_FUND": "false",
      "NPM_CONFIG_AUDIT": "false"
    }
  },
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["cle1"],
  "functions": {},
  "crons": [],
  "headers": [
    {
      "source": "/cesium/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
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
    },
    {
      "source": "/(.*\\.(js|css|woff2?|png|jpe?g|gif|svg|ico|webp|avif))",
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
      "source": "/((?!api|_next|cesium|assets|favicon.ico|sitemap.xml|robots.txt).*)",
      "destination": "/index.html"
    }
  ],
  "trailingSlash": false,
  "cleanUrls": true,
  "github": {
    "autoAlias": false
  }
}
```

**Vercel Configuration Explained**:
- **Build Environment**: Node.js 18 with optimized npm settings
- **Regions**: Deployed to Cleveland (adjust based on user base)
- **Caching Strategy**: Aggressive caching for static assets
- **CORS Headers**: Allows Cesium asset loading
- **Rewrites**: SPA-style routing for static export

### 4. Cesium Asset Management

#### `scripts/copy-cesium-assets.js`

```javascript
const fs = require('fs');
const path = require('path');

/**
 * Recursively copy directory contents
 * Fallback for environments where symlinks don't work (like Vercel)
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    // Copy all contents recursively
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    // Copy file
    fs.copyFileSync(src, dest);
  }
}

/**
 * Main function to copy Cesium assets
 */
function copyCesiumAssets() {
  const cesiumSource = path.join(__dirname, '../node_modules/cesium/Build/Cesium');
  const cesiumDest = path.join(__dirname, '../public/cesium');
  
  try {
    // Check if source exists
    if (!fs.existsSync(cesiumSource)) {
      throw new Error(`Cesium source directory not found: ${cesiumSource}`);
    }
    
    console.log('📦 Copying Cesium assets...');
    console.log(`Source: ${cesiumSource}`);
    console.log(`Destination: ${cesiumDest}`);
    
    // Remove existing destination if it exists
    if (fs.existsSync(cesiumDest)) {
      fs.rmSync(cesiumDest, { recursive: true, force: true });
    }
    
    // Copy assets
    copyRecursiveSync(cesiumSource, cesiumDest);
    
    // Verify copy was successful
    const copiedFiles = fs.readdirSync(cesiumDest);
    console.log(`✅ Cesium assets copied successfully (${copiedFiles.length} items)`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to copy Cesium assets:', error.message);
    console.log('🔄 Will attempt to fall back to symlink strategy');
    return false;
  }
}

// Execute if run directly
if (require.main === module) {
  const success = copyCesiumAssets();
  process.exit(success ? 0 : 1);
}

module.exports = { copyCesiumAssets, copyRecursiveSync };
```

**Asset Management Strategy**:
- **Primary**: Copy strategy for Vercel compatibility
- **Fallback**: Symlink strategy for local development
- **Verification**: Checks for successful copy operation
- **Cleanup**: Removes existing destination before copying

### 5. Environment Variable Configuration

#### `.env.example` Template

```bash
# =================================
# Supabase Configuration (Required)
# =================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =================================
# TiTiler Configuration (Required)
# =================================
NEXT_PUBLIC_TITILER_BASE_URL=https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net
NEXT_PUBLIC_COG_URL=https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif

# =================================
# Cesium Configuration (Required)
# =================================
NEXT_PUBLIC_CESIUM_ION_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =================================
# Optional Configuration
# =================================
NEXT_PUBLIC_GAME_API_BASE_URL=https://your-additional-api.com

# =================================
# Development Only (Local)
# =================================
NODE_ENV=development
ANALYZE=false

# =================================
# Vercel Platform Variables (Auto-set)
# =================================
# VERCEL_ENV=production
# NEXT_PUBLIC_VERCEL_URL=your-app.vercel.app
# VERCEL_URL=your-app.vercel.app
```

#### Environment Variable Security Configuration

```javascript
// utils/env-validation.js
/**
 * Environment variable validation for runtime
 */
export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_TITILER_BASE_URL',
    'NEXT_PUBLIC_COG_URL',
    'NEXT_PUBLIC_CESIUM_ION_TOKEN'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file or Vercel environment configuration.`
    );
  }
  
  return true;
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isVercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    deploymentUrl: process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:8080'
  };
}
```

### 6. TypeScript Configuration Updates

#### `tsconfig.json` Optimizations

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6", "es2017"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/game/*": ["./src/game/*"]
    },
    "types": ["node", "cesium"]
  },
  "include": [
    "next-env.d.ts", 
    "**/*.ts", 
    "**/*.tsx", 
    ".next/types/**/*.ts",
    "scripts/**/*.js"
  ],
  "exclude": [
    "node_modules",
    "dist",
    ".next",
    "public/cesium"
  ]
}
```

### 7. Build Optimization Scripts

#### `scripts/build-optimization.js`

```javascript
const fs = require('fs');
const path = require('path');

/**
 * Pre-build optimization script
 */
function optimizeForBuild() {
  console.log('🔧 Running pre-build optimizations...');
  
  // Clear any existing build artifacts
  const cleanDirs = ['dist', '.next', 'public/cesium'];
  cleanDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`🧹 Cleaned ${dir}`);
    }
  });
  
  // Ensure required directories exist
  const requiredDirs = ['public', 'scripts'];
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created ${dir}`);
    }
  });
  
  console.log('✅ Pre-build optimizations complete');
}

/**
 * Post-build validation script
 */
function validateBuild() {
  console.log('🔍 Validating build output...');
  
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    throw new Error('Build failed: dist directory not found');
  }
  
  const requiredFiles = ['index.html', '_next'];
  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(path.join(distDir, file))
  );
  
  if (missingFiles.length > 0) {
    throw new Error(`Build incomplete: missing ${missingFiles.join(', ')}`);
  }
  
  // Check for Cesium assets
  const cesiumDir = path.join(distDir, 'cesium');
  if (!fs.existsSync(cesiumDir)) {
    console.warn('⚠️  Warning: Cesium assets not found in build output');
  }
  
  console.log('✅ Build validation complete');
}

module.exports = { optimizeForBuild, validateBuild };

// Execute if run directly
if (require.main === module) {
  const command = process.argv[2];
  if (command === 'pre') {
    optimizeForBuild();
  } else if (command === 'post') {
    validateBuild();
  } else {
    console.log('Usage: node build-optimization.js [pre|post]');
  }
}
```

### 8. Git Configuration Updates

#### `.gitignore` Updates

```gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build
/dist

# misc
.DS_Store
*.pem
*:Zone.Identifier

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# Cesium
/public/cesium

# Analysis
/analyze

# Backups
*.backup

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
Thumbs.db

# Custom
repomix-output-*.xml
supabase_nextjs.txt
```

## Performance and Security Considerations

### Bundle Size Optimization

```javascript
// next.config.mjs additions for bundle optimization
const nextConfig = {
  // ... existing config
  
  // Bundle optimization
  experimental: {
    optimizePackageImports: [
      'cesium',
      'phaser', 
      '@supabase/supabase-js',
      'resium'
    ],
    // Tree shaking optimization
    serverComponentsExternalPackages: ['cesium']
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // ... existing webpack config
    
    if (!dev) {
      // Production optimizations
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          cesium: {
            test: /[\\/]node_modules[\\/]cesium[\\/]/,
            name: 'cesium',
            chunks: 'all',
            priority: 20
          },
          phaser: {
            test: /[\\/]node_modules[\\/]phaser[\\/]/,
            name: 'phaser', 
            chunks: 'all',
            priority: 20
          }
        }
      };
    }
    
    return config;
  }
};
```

### Security Headers Configuration

```javascript
// Security headers for production
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];
```

## Deployment Validation

### Required File Checklist

```markdown
Pre-Deployment File Checklist:
- [ ] package.json (updated scripts and engines)
- [ ] next.config.mjs (Vercel optimizations)
- [ ] vercel.json (platform configuration)
- [ ] scripts/copy-cesium-assets.js (asset management)
- [ ] .env.example (environment template)
- [ ] .gitignore (updated exclusions)
- [ ] tsconfig.json (path optimizations)

Optional Enhancement Files:
- [ ] scripts/build-optimization.js (build helpers)
- [ ] utils/env-validation.js (runtime validation)
- [ ] analyze/ (bundle analysis output)
```

### Configuration Validation Script

```javascript
// scripts/validate-config.js
const fs = require('fs');
const path = require('path');

function validateConfiguration() {
  const errors = [];
  const warnings = [];
  
  // Check required files
  const requiredFiles = [
    'package.json',
    'next.config.mjs', 
    'vercel.json',
    '.env.example'
  ];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      errors.push(`Missing required file: ${file}`);
    }
  });
  
  // Validate package.json
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!pkg.engines || !pkg.engines.node) {
      warnings.push('package.json missing Node.js engine specification');
    }
    if (!pkg.scripts['vercel-build']) {
      errors.push('package.json missing vercel-build script');
    }
  } catch (e) {
    errors.push('Invalid package.json file');
  }
  
  // Report results
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  console.log('✅ Configuration validation passed');
}

if (require.main === module) {
  validateConfiguration();
}

module.exports = { validateConfiguration };
```

This comprehensive configuration guide provides all the technical specifications needed to successfully deploy the Phaser habitat game to Vercel while maintaining full functionality and optimal performance.