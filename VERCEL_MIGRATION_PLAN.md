# Vercel Migration Plan: Phaser Habitat Game

## Executive Summary

This document outlines the comprehensive plan for migrating the Phaser match-3 habitat game from local development (`npm run dev`) to Vercel cloud deployment. The application is a Next.js 15.3.1 static export with Cesium 3D globe integration, Phaser game engine, and Supabase backend.

## Current Application State Analysis

### Architecture Overview
- **Framework**: Next.js 15.3.1 with React 18
- **Game Engine**: Phaser 3.90.0 for match-3 puzzle mechanics
- **3D Visualization**: Cesium 1.117.0 with Resium for globe interaction
- **Backend**: Supabase with PostGIS for spatial queries
- **Build Output**: Static export (`output: 'export'`) to `dist/` folder
- **Development Port**: Custom port 8080 (non-standard)

### Current Dependencies & Integrations
```json
Key Dependencies:
- @supabase/supabase-js: ^2.49.10 (database integration)
- cesium: ^1.117.0 (3D globe functionality) 
- phaser: ^3.90.0 (game engine)
- resium: ^1.17.2 (React-Cesium bridge)
- next: 15.3.1 (framework)
```

### External Service Dependencies
1. **Supabase Database**: 
   - Species data (`icaa` table)
   - Raster habitat data (`habitat_raster` table)
   - Spatial functions for location queries

2. **Azure TiTiler Service**: 
   - Endpoint: `https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net`
   - Purpose: Habitat raster tile generation

3. **Azure Blob Storage**: 
   - COG file: `https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif`
   - Purpose: Habitat data source for tiles

### Current Build Process Analysis
```bash
Current Scripts:
- dev: "node log.js dev & next dev -p 8080"
- build: "node log.js build & npm run typecheck && next build"
- postinstall: "symlink-dir node_modules/cesium/Build/Cesium public/cesium"
```

**Issues for Vercel Migration**:
1. **Analytics Logging**: `log.js` makes external HTTP requests during build
2. **Custom Port**: Port 8080 instead of Vercel's standard ports
3. **Symlink Dependencies**: `symlink-dir` may not work on Vercel's build environment
4. **Static Export**: Already configured but needs Vercel optimization

## Migration Strategy

### Phase 1: Pre-Migration Preparation (2-3 hours)

#### 1.1 Build System Optimization
**Goals**: 
- Remove build-time external dependencies
- Ensure Vercel compatibility
- Maintain development workflow

**Actions**:
- Create Vercel-specific build scripts
- Replace symlink strategy with copy strategy for Cesium assets
- Add Node.js version specification for Vercel

#### 1.2 Configuration Updates
**Files to Modify**:
- `package.json`: Add Vercel-optimized scripts
- `next.config.mjs`: Ensure static export optimization
- `vercel.json`: Create Vercel deployment configuration
- `.env.example`: Document required environment variables

#### 1.3 Asset Management Strategy
**Cesium Assets Challenge**:
- Current: Symlink from `node_modules/cesium/Build/Cesium` to `public/cesium`
- Vercel Solution: Copy assets during build process
- Ensure assets are included in static export

### Phase 2: Vercel Platform Setup (1-2 hours)

#### 2.1 Account and Project Setup
1. **Vercel Account**: Create/configure Vercel account
2. **GitHub Integration**: Connect repository to Vercel
3. **Project Configuration**: Import Next.js project with custom settings

#### 2.2 Environment Variable Configuration
**Required Variables**:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abhhfiazxykwcpkyvavk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[supabase_anon_key]

# TiTiler Configuration  
NEXT_PUBLIC_TITILER_BASE_URL=https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net
NEXT_PUBLIC_COG_URL=https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif

# Cesium Configuration
NEXT_PUBLIC_CESIUM_ION_TOKEN=[cesium_token]

# Optional: Custom configurations
NEXT_PUBLIC_GAME_API_BASE_URL=[if_needed]
```

#### 2.3 Deployment Configuration
**Build Settings**:
- Framework Preset: Next.js
- Build Command: Custom command for static export
- Output Directory: `dist` (matching current setup)
- Node.js Version: Specify compatible version

### Phase 3: Testing and Validation (1-2 hours)

#### 3.1 Preview Deployment Testing
**Test Scenarios**:
1. **Map Functionality**: Cesium globe loads and responds to clicks
2. **Game Mechanics**: Phaser game initializes and runs correctly
3. **Database Integration**: Supabase queries return expected data
4. **Habitat Visualization**: TiTiler tiles load properly
5. **Asset Loading**: All static assets (images, sounds) load correctly

#### 3.2 Performance Validation
**Metrics to Monitor**:
- Build time (should be < 5 minutes)
- Bundle size (monitor for Vercel limits)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

#### 3.3 Functionality Verification Checklist
```markdown
- [ ] Cesium globe renders correctly
- [ ] Map click triggers species/habitat queries
- [ ] Phaser game starts with species data
- [ ] Green gem matches show raster habitat clues
- [ ] All gem categories reveal appropriate clues
- [ ] Info window displays habitat count and percentages
- [ ] Species progression works through multiple species
- [ ] Game reset functionality works
- [ ] Error handling works for failed queries
```

### Phase 4: Production Deployment (30 minutes)

#### 4.1 Domain Configuration
- **Options**: Use Vercel subdomain or configure custom domain
- **SSL**: Automatic SSL certificate provisioning
- **Performance**: Global CDN distribution

#### 4.2 Monitoring Setup
- **Vercel Analytics**: Enable if replacing current analytics
- **Error Monitoring**: Configure error tracking
- **Performance Monitoring**: Set up Core Web Vitals tracking

## Risk Assessment and Mitigation

### High-Risk Areas

#### 1. Cesium Asset Loading
**Risk**: Cesium assets may not load properly due to build process changes
**Mitigation**: 
- Test asset copying strategy thoroughly
- Implement fallback asset loading mechanisms
- Verify Cesium base URL configuration

#### 2. Static Export Compatibility
**Risk**: Some Next.js features may not work with static export
**Mitigation**:
- Current app already uses static export successfully
- Verify all components are client-side compatible
- Test all routes and dynamic behavior

#### 3. External Service Dependencies
**Risk**: Azure TiTiler service may have CORS or connectivity issues
**Mitigation**:
- Test TiTiler connectivity from Vercel deployment
- Verify CORS configuration allows Vercel domains
- Have fallback plan for habitat visualization

#### 4. Environment Variable Security
**Risk**: Accidentally exposing sensitive credentials
**Mitigation**:
- Use `NEXT_PUBLIC_` prefix only for public variables
- Store sensitive keys in Vercel environment variables
- Audit all environment variable usage

### Medium-Risk Areas

#### 1. Build Performance
**Risk**: Build time may increase on Vercel platform
**Mitigation**:
- Optimize package.json scripts
- Use Vercel build cache effectively
- Monitor build performance metrics

#### 2. Bundle Size Limits
**Risk**: Large bundle due to Cesium and Phaser dependencies
**Mitigation**:
- Monitor bundle size with Vercel analytics
- Implement code splitting if needed
- Optimize asset loading strategies

## Success Criteria

### Functional Requirements ✅
1. **Complete Game Functionality**: All game mechanics work identically to local version
2. **Map Integration**: Cesium globe and TiTiler visualization work correctly
3. **Database Connectivity**: All Supabase queries return expected results
4. **Performance**: Page load times within acceptable ranges
5. **Cross-Browser Compatibility**: Works on major browsers

### Technical Requirements ✅
1. **Automated Deployment**: GitHub integration enables automatic deployments
2. **Environment Management**: Proper separation of development/production configs
3. **Security**: No exposed credentials or security vulnerabilities
4. **Monitoring**: Adequate monitoring and error tracking in place

### Operational Requirements ✅
1. **Zero-Downtime Deployment**: New deployments don't break existing functionality
2. **Rollback Capability**: Ability to quickly revert to previous working version
3. **Documentation**: Complete documentation for future maintenance
4. **Team Access**: Appropriate team access and permissions configured

## Timeline and Resource Allocation

### Estimated Timeline: 4-7 hours total

**Phase 1 (2-3 hours)**:
- Configuration updates: 1-2 hours
- Build script optimization: 1 hour
- Testing locally: 30 minutes

**Phase 2 (1-2 hours)**:
- Vercel account setup: 30 minutes
- Environment variable configuration: 30 minutes
- Initial deployment: 30-60 minutes

**Phase 3 (1-2 hours)**:
- Preview testing: 45-60 minutes
- Performance validation: 30 minutes
- Bug fixes (if needed): 15-30 minutes

**Phase 4 (30 minutes)**:
- Production deployment: 15 minutes
- Final verification: 15 minutes

### Resource Requirements
- **Developer Time**: 4-7 hours of focused development work
- **Testing Time**: Additional 1-2 hours for thorough testing
- **Vercel Account**: Pro plan recommended for team collaboration
- **Domain**: Optional custom domain setup

## Rollback Strategy

### Immediate Rollback Options
1. **Vercel Dashboard**: Instantly rollback to previous deployment
2. **Local Development**: Continue using current local setup if needed
3. **Alternative Hosting**: Deploy to other static hosting if Vercel fails

### Data Backup
- **No Data Migration**: Current Supabase database remains unchanged
- **Configuration Backup**: All current configurations documented
- **Asset Backup**: Local development environment preserved

## Post-Migration Optimization Opportunities

### Performance Enhancements
1. **CDN Optimization**: Leverage Vercel's global CDN for faster asset delivery
2. **Caching Strategy**: Implement intelligent caching for API responses
3. **Bundle Optimization**: Further optimize bundle size and loading strategies

### Operational Improvements
1. **CI/CD Pipeline**: Automated testing and deployment workflows
2. **Preview Deployments**: Branch-based preview environments for testing
3. **Monitoring Enhancement**: Advanced performance and error monitoring

### Future Scalability
1. **Edge Functions**: Consider Vercel Edge Functions for future features
2. **Analytics Integration**: Integrate Vercel Analytics for user insights
3. **A/B Testing**: Implement feature flags and A/B testing capabilities

## Conclusion

This migration plan provides a structured approach to moving from local development to Vercel deployment while maintaining all current functionality. The static export architecture is well-suited for Vercel's platform, and the main challenges involve build process optimization and asset management.

The migration offers significant benefits including automatic deployments, global CDN, and simplified hosting management, while the risk profile is relatively low due to the application's static export architecture and well-defined external dependencies.

**Next Steps**: Review this plan with stakeholders and proceed with Phase 1 implementation using the detailed guides in the accompanying documentation files.