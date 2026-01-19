# Habitat Highlight Implementation

## Overview
This implementation adds visual feedback when users click on the Cesium globe in areas with no species. Instead of leaving users confused about why nothing happened, the system now finds and highlights the nearest habitat polygon for 3 seconds, guiding them to click on a productive area.

## What Was Implemented

### 1. API Route (Database Layer)
**File**: `src/app/api/species/closest/route.ts`
- **Route**: `GET /api/species/closest?lon=&lat=`
- **Returns**: GeoJSON geometry of the closest habitat polygon
- **Implementation**: Uses PostGIS `<->` for nearest-neighbor search and `ST_AsGeoJSON`

### 2. Service Method (Backend Integration)
**File**: `src/lib/speciesService.ts`
- **Method**: `getClosestHabitat(longitude: number, latitude: number): Promise<any>`
- **Purpose**: Calls the API route and returns GeoJSON geometry
- **Error Handling**: Logs errors and returns null on failure

### 3. UI Implementation (Frontend)
**File**: `src/components/CesiumMap.tsx`

#### New Imports:
```typescript
GeoJsonDataSource,
Color as CesiumColor
```

#### Map Click Handler Updates:
- **Existing Logic**: When species are found, renders them as yellow polygons
- **New Logic**: When NO species are found:
  1. Calls `speciesService.getClosestHabitat()`
  2. Creates a `GeoJsonDataSource` named 'habitat-highlight'
  3. Styles the polygon with cyan color + outline
  4. Sets a 3-second timeout to remove the highlight
  5. Still emits the event with an empty species array

## TODOs and Improvements

**TODO 1: Add Loading State**
```
Task: Show loading indicator while finding closest habitat
Location: CesiumMap.tsx before calling `getClosestHabitat`
Implementation: Set loading state, show spinner/message, clear after response
```

**TODO 4: Enhance Visual Feedback**
```
Task: Make highlight more prominent
Options:
- Add pulsing animation to the highlighted polygon
- Show distance to highlighted habitat in info box
- Add arrow or line from click point to habitat
```

**TODO 5: Performance Optimization**
```
Task: Add spatial index if not exists
SQL: CREATE INDEX IF NOT EXISTS idx_icaa_geometry ON icaa USING GIST (wkb_geometry);
Benefit: Faster nearest-neighbor queries
```

## Known Issues

### Issue 1: No Feedback for API Errors
- **Problem**: If `getClosestHabitat` (API call) fails, user sees no visual feedback
- **Impact**: User confusion when clicks don't work
- **Solution**: Add error toast or message

### Issue 2: Highlight Removal on New Click
- **Problem**: If user clicks again within 3 seconds, old highlight remains
- **Impact**: Multiple overlapping highlights possible
- **Solution**: Clear existing highlights before creating new ones (partially implemented)

### Issue 3: Color Accessibility
- **Problem**: Cyan highlight might not be visible for colorblind users
- **Impact**: Reduced usability for ~8% of users
- **Solution**: Add pattern fill or animation in addition to color

## Code Reference

### Classes and Components:
- `CesiumMap` (React Component): `src/components/CesiumMap.tsx`
  - Main map component handling user interactions

### Functions:
- `GET /api/species/closest`: API route at `src/app/api/species/closest/route.ts`
- `getClosestHabitat`: Service method at `src/lib/speciesService.ts`
- `handleMapClick`: Event handler at `src/components/CesiumMap.tsx`

### Key Variables:
- `closestHabitatGeometry`: Stores GeoJSON result
- `highlightDataSource`: Cesium data source for rendering (line 288)
- `'habitat-highlight'`: Data source name for highlight layer

### Event Flow:
1. User clicks map → `handleMapClick` (line 150)
2. Query species → `speciesService.getSpeciesAtPoint` (line 170)
3. If no species → `speciesService.getClosestHabitat` (line 278)
4. Render highlight → `GeoJsonDataSource` processing (lines 288-303)
5. Auto-remove → `setTimeout` cleanup (lines 306-313)

## Testing Checklist
- [ ] Click on ocean (should highlight nearest coastal habitat)
- [ ] Click on desert (should highlight nearest habitat)
- [ ] Click rapidly in different locations (old highlights should clear)
- [ ] Click same spot twice (should re-highlight)
- [ ] Verify 3-second timeout works consistently
- [ ] Check console for any errors during clicks

## Future Enhancements
1. **Batch Highlighting**: Show top 3 nearest habitats with different colors
2. **Distance Display**: Show "Nearest habitat: 2.3 km away"
3. **Habitat Preview**: Show habitat type and likely species count
4. **Smart Guidance**: Arrow pointing to habitat center
5. **Caching**: Cache closest habitat queries for repeated clicks
