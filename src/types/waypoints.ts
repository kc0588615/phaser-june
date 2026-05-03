export type WaypointType =
  | 'city'
  | 'river'
  | 'lake'
  | 'wetland'
  | 'protected_area'
  | 'bioregion_edge'
  | 'basecamp';

export const WAYPOINT_TYPE_LABELS: Record<WaypointType, string> = {
  city: 'City',
  river: 'River',
  lake: 'Lake',
  wetland: 'Wetland',
  protected_area: 'Protected',
  bioregion_edge: 'Ecotone',
  basecamp: 'Basecamp',
};

export function getWaypointTypeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return WAYPOINT_TYPE_LABELS[type as WaypointType] ?? type.replace(/_/g, ' ');
}

export type WaypointNodeRole =
  | 'start'
  | 'river'
  | 'water'
  | 'protected_area'
  | 'protected_area_alt'
  | 'final';

export type WdpaDesignationCategory =
  | 'nature_reserve'
  | 'national_park'
  | 'natural_monument'
  | 'landscape'
  | 'heritage'
  | 'community'
  | 'habitat_directive'
  | 'protected_area';

export interface ExpeditionWaypoint {
  slot: 0 | 1 | 2 | 3 | 4 | 5;
  waypointType: WaypointType;
  nodeRole: WaypointNodeRole;
  name: string;
  lon: number;
  lat: number;
  distKm: number;
  rankScore: number;
  sourceTable: string | null;
  sourceId: string | number | null;
  designationCategory?: WdpaDesignationCategory;
  fallback: boolean;
}

export type ExpeditionWaypointMemory = Partial<Pick<
  ExpeditionWaypoint,
  | 'slot'
  | 'waypointType'
  | 'nodeRole'
  | 'name'
  | 'lon'
  | 'lat'
  | 'fallback'
  | 'designationCategory'
>>;

export interface WaypointRoutePoint {
  lon: number;
  lat: number;
  waypointSlot: number;
}

export interface ExpeditionWaypointResponse {
  origin: { lon: number; lat: number };
  radiusKm: number;
  waypoints: ExpeditionWaypoint[];
  routePolyline: WaypointRoutePoint[];
  debug?: { candidateCounts: Record<WaypointType, number> };
}
