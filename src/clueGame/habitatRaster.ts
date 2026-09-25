// Where the habitat-type raster lives (a Cloud-Optimized GeoTIFF served by
// TiTiler). Both come from NEXT_PUBLIC_ env vars; without them the place card
// just skips its habitat picture.
export const TITILER_BASE_URL = process.env.NEXT_PUBLIC_TITILER_BASE_URL ?? '';
export const HABITAT_COG_URL = process.env.NEXT_PUBLIC_COG_URL ?? '';
export const HABITAT_RASTER_READY = TITILER_BASE_URL !== '' && HABITAT_COG_URL !== '';
