export const PREFERRED_RESEARCH_SITE_SPACING_KM = 150;
export const RELAXED_RESEARCH_SITE_SPACING_KM = 100;
export const MAX_RESEARCH_SITE_SPACING_KM = 800;

export function routeDistanceKm(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const hav = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

export function satisfiesResearchSiteSpacing(
  sites: readonly { lon: number; lat: number }[],
  minimumKm = PREFERRED_RESEARCH_SITE_SPACING_KM,
  maximumKm = MAX_RESEARCH_SITE_SPACING_KM,
): boolean {
  if (sites.length !== 3) return false;
  for (let left = 0; left < sites.length; left += 1) {
    for (let right = left + 1; right < sites.length; right += 1) {
      const distance = routeDistanceKm(sites[left], sites[right]);
      if (distance < minimumKm || distance > maximumKm) return false;
    }
  }
  return true;
}
