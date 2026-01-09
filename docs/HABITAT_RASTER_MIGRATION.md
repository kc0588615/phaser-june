# Habitat Raster Migration to TiTiler

**Date:** December 2025
**Status:** Implementation Complete

## Summary

Migrated habitat distribution queries from legacy `habitat_raster` storage to TiTiler COG statistics endpoint. This removes database raster storage, improves scalability, and simplifies raster data updates.

## Changes Made

### Code Updates (✅ Complete)

1. **src/lib/speciesService.ts**
   - Added `STATIC_HABITAT_CODE_TO_LABEL` mapping (~80 habitat types)
   - Added `createBboxGeoJSON()` helper for 10km bounding box
   - Added `getHabitatColormap()` for database fallback lookup
   - Replaced `getRasterHabitatDistribution()` implementation:
     - **Old:** legacy RPC `get_habitat_distribution_10km`
     - **New:** TiTiler POST `/cog/statistics?categorical=true`
   - Output interface unchanged: `RasterHabitatResult[]`

2. **src/components/CesiumMap.tsx**
   - Added `RectangleGraphics` import from resium
   - Added `queryBounds` state for visual bbox
   - Replaced `EllipseGraphics` (circle) with `RectangleGraphics` (bbox)
   - Visual now 100% matches TiTiler query geometry

3. **src/config/habitatColors.ts**
   - Existing color map for habitat labels (unchanged)

4. **docs/DATABASE_USER_GUIDE.md**
   - Documented TiTiler integration
   - Marked `get_habitat_distribution_10km` as deprecated

### Database Cleanup (⚠️ Pending)

**Safe to remove after validation:**

```sql
-- Drop deprecated RPC function
DROP FUNCTION IF EXISTS get_habitat_distribution_10km(float, float);

-- Drop raster table (no longer needed)
DROP TABLE IF EXISTS habitat_raster;
```

**Keep:**
- `habitat_colormap` table (fallback for code → label mapping)

## Architecture

### Before (Legacy Raster RPC)
```
User Click → CesiumMap (circle visual)
           ↓
Legacy RPC: get_habitat_distribution_10km(lon, lat)
           ↓
Query habitat_raster table (PostGIS raster)
           ↓
ST_Buffer(10km circle) + ST_ValueCount
           ↓
{habitat_type, percentage}[]
```

### After (TiTiler)
```
User Click → CesiumMap
           ↓
Compute 10km bbox + setQueryBounds (rectangle visual)
           ↓
speciesService.getRasterHabitatDistribution(lon, lat)
           ↓
createBboxGeoJSON() → POST TiTiler /cog/statistics?categorical=true
           ↓
Parse histogram: [[counts], [values]] (numpy format)
           ↓
Map codes via STATIC_HABITAT_CODE_TO_LABEL
           ↓
{habitat_type, percentage}[]
```

## Key Implementation Details

### Bounding Box Calculation
```typescript
// Same formula in speciesService.ts and CesiumMap.tsx
const metersPerDegreeLat = 111320;
const metersPerDegreeLon = 111320 * Math.cos(latitude * Math.PI / 180);
const deltaLat = 10000 / metersPerDegreeLat;  // 10km
const deltaLon = 10000 / metersPerDegreeLon;
// bbox: [lon-deltaLon, lat-deltaLat, lon+deltaLon, lat+deltaLat]
```

### TiTiler Histogram Format
```javascript
// TiTiler returns numpy-style histogram: [[counts], [values]]
const [counts, values] = band1Stats.histogram;
// NOT [values, counts] - this was a bug that caused wrong results
```

### Colormap Resolution
1. Check `STATIC_HABITAT_CODE_TO_LABEL` (local, fast)
2. Fallback to `habitat_colormap` table via `getHabitatColormap()` (cached)
3. Unknown codes logged once per session, skipped in results

## Configuration

Environment variables (`.env.local`):
```bash
NEXT_PUBLIC_TITILER_BASE_URL=https://j8dwwxhoad.execute-api.us-east-2.amazonaws.com
NEXT_PUBLIC_COG_URL=https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif
```

## Benefits

1. **Storage:** No raster data in database (COG on S3)
2. **Scalability:** TiTiler serverless scales independently
3. **Updates:** Swap COG file; no DB migration needed
4. **Performance:** COG tile caching, optimized range reads
5. **Visual accuracy:** Bbox visual matches query exactly

## Testing Checklist

- [x] Click map locations in various biomes
- [x] Verify habitat types return with correct colors
- [x] Check histogram parsing (counts/values order)
- [x] Compare results with legacy RPC output
- [x] Visual bbox matches TiTiler query area
- [ ] Test edge cases: ocean, polar, land/water boundaries
- [ ] Production traffic validation

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/speciesService.ts` | TiTiler query, bbox helper, colormap |
| `src/components/CesiumMap.tsx` | RectangleGraphics, queryBounds state |
| `docs/DATABASE_USER_GUIDE.md` | TiTiler documentation |
| `docs/HABITAT_RASTER_MIGRATION.md` | This file |

## Rollback Plan

```bash
git revert <commit-hash>
# Re-enable legacy RPC if dropped
```

## Technical Notes

- **Bounding box:** 10km half-width in each direction (20km x 20km total area)
- **Histogram format:** `[[counts], [values]]` - numpy style, NOT `[[values], [counts]]`
- **Water filtering:** Code 0 excluded from results
- **Threshold:** < 0.01% habitats filtered out
- **Band:** Single-band classification raster (band 1 / b1)
- **Precision:** 2 decimal places for percentages
