# Cesium-Phaser Integration: Lessons Learned

## Project Overview
Integration of CesiumJS 3D globe with Phaser 3 match-3 game in Next.js environment. The goal was to allow users to click on the Cesium globe to select locations and initialize the Phaser game board with habitat data.

## What Worked Successfully ✅

### 1. Basic Cesium Setup in Next.js
- **Cesium as External Library**: Treating Cesium as external dependency via script tag loading
- **Symlink Setup**: `public/cesium` → `node_modules/cesium/Build/Cesium` works reliably
- **Next.js Configuration**: Webpack externals configuration prevents bundling conflicts
```javascript
config.externals = {
  ...config.externals,
  cesium: 'Cesium'
};
```

### 2. EventBus Communication Pattern
- **TypedEventBus**: Strong typing between React and Phaser components
- **Event Structure**: Well-defined payload types prevent runtime errors
```typescript
export interface EventPayloads {
  'cesium-location-selected': {
    lon: number;
    lat: latitude: number;
    habitats: number[]; // Important: Use IDs, not names
    species: string[];
  };
}
```

### 3. Error Handling & Graceful Degradation
- **Backend Health Checks**: Always check if TiTiler/API backends are available
- **Mock Data Fallback**: Provide fallback data when backends are down
- **Scene State Validation**: Check if Phaser scenes are active before method calls

### 4. Runtime Error Prevention
- **Null Checks**: Always validate object existence before calling methods
- **Scene Activity Checks**: Verify `this.scene.isActive()` before Phaser operations
- **Resource Cleanup**: Proper EventBus listener cleanup in component unmount

## What Didn't Work / Caused Issues ❌

### 1. Cesium Visibility Problems
**Issue**: Cesium globe loading but remaining invisible
**Root Causes**:
- CSS conflicts with Tailwind/shadcn
- Missing explicit canvas sizing
- Z-index and positioning conflicts
- Cesium widgets.css not properly applied

**Solution Needed**:
```css
.cesium-widget canvas {
    width: 100% !important;
    height: 100% !important;
    display: block !important;
}
```

### 2. TiTiler Integration Complexity
**Issue**: COG (Cloud Optimized GeoTIFF) layers not loading
**Problems**:
- TiTiler backend dependency creates single point of failure
- Complex tile URL templating
- CORS and network configuration issues
- Windows file path encoding problems

**Better Approach**: Start with basic Cesium Ion imagery, add TiTiler as enhancement

### 3. Phaser Scene Lifecycle Issues
**Issue**: Runtime errors when EventBus emits to inactive/destroyed scenes
**Specific Errors**:
- `Cannot read properties of null (reading 'add')`
- `Cannot read properties of undefined (reading 'size')`

**Critical Fix Pattern**:
```typescript
if (!this.scene.isActive() || !this.add || !this.scale) {
    console.warn("Scene not ready, ignoring event");
    return;
}
```

### 4. Type Mismatches in EventBus
**Issue**: Inconsistent data types between components
**Problem**: Mixing habitat names (strings) vs habitat IDs (numbers)
**Solution**: Establish clear data contracts and stick to them

## Technical Recommendations for Next Build

### 1. Start Simple, Add Complexity Gradually
```markdown
Phase 1: Basic Cesium globe with click detection
Phase 2: EventBus integration with mock data
Phase 3: Add backend API integration
Phase 4: Add TiTiler COG overlays
```

### 2. Essential CSS for Cesium
Always include these CSS rules from the start:
```css
/* Import Cesium CSS */
@import url('/cesium/Widgets/widgets.css');

/* Force Cesium visibility */
.cesium-viewer, .cesium-widget {
    width: 100% !important;
    height: 100% !important;
}
.cesium-widget canvas {
    display: block !important;
}
```

### 3. Robust EventBus Pattern
```typescript
// Always check scene state
private handleEvent(data: EventPayload): void {
    if (!this.scene?.isActive() || !this.add) return;
    // ... safe to proceed
}

// Always cleanup listeners
shutdown(): void {
    EventBus.off('event-name', this.handler, this);
}
```

### 4. Development vs Production Approach
- **Development**: Use mock data, skip external dependencies
- **Production**: Add health checks and graceful fallbacks
- **Never**: Make external services hard dependencies for core functionality

### 5. Container Sizing Strategy
```typescript
// Explicit container setup
<div style={{
    width: '100%',
    height: '100%',
    minHeight: '400px', // Fallback height
    position: 'relative',
    backgroundColor: '#000' // Debug background
}}>
```

## Debugging Strategies That Work

### 1. Console Logging Strategy
- Log Cesium viewer creation success/failure
- Log EventBus emissions and receptions
- Log scene state before operations
- Log container dimensions and CSS properties

### 2. Incremental Testing
1. Test Cesium globe visibility first
2. Test click detection with console logs
3. Test EventBus with simple payloads
4. Test Phaser scene reactions
5. Add real data last

### 3. Fallback Testing
Always test with:
- No internet connection (Cesium Ion failure)
- No backend APIs available
- Scene switching/unmounting during operations

## Critical Success Factors

1. **CSS Precedence**: Use `!important` for Cesium styles to override frameworks
2. **Null Safety**: Validate every object before method calls
3. **Scene Lifecycle**: Understand Phaser scene creation/destruction timing
4. **Type Safety**: Use TypeScript strictly for EventBus payloads
5. **Error Boundaries**: Wrap Cesium operations in try-catch blocks
6. **Development Workflow**: Test components independently before integration

## File Structure That Works
```
src/
├── components/
│   ├── CesiumMap.tsx (simple, focused on rendering)
│   └── CesiumMapSimple.tsx (debugging fallback)
├── game/
│   ├── EventBus.ts (typed, centralized)
│   └── scenes/Game.ts (defensive event handling)
└── styles/
    └── globals.css (Cesium CSS included)
```

This structure keeps concerns separated and makes debugging easier.