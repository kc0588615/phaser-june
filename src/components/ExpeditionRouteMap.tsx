import { useId } from 'react';
import { cn } from '@/lib/utils';
import type { RoutePoint } from '@/lib/expeditionRoute';
import {
  getWaypointTypeLabel,
  WAYPOINT_TYPE_COLORS,
  type ExpeditionWaypointMemory,
  type WaypointType,
} from '@/types/waypoints';

const VIEW_WIDTH = 360;
const VIEW_HEIGHT = 210;
const PAD = 24;
const TOP_PAD = 18;

interface ExpeditionRouteMapProps {
  routePolyline?: RoutePoint[];
  waypoints?: ExpeditionWaypointMemory[];
  visitedWaypointSlot?: number;
  captured?: boolean;
  showLabels?: boolean;
  className?: string;
  ariaLabel?: string;
}

interface GeoPoint {
  lon: number;
  lat: number;
}

interface RouteMapPoint extends GeoPoint {
  slot: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
}

export function ExpeditionRouteMap({
  routePolyline = [],
  waypoints = [],
  visitedWaypointSlot,
  captured = true,
  showLabels = true,
  className,
  ariaLabel = 'Expedition route',
}: ExpeditionRouteMapProps) {
  const id = useId().replace(/:/g, '');
  const validWaypoints = waypoints
    .filter(isRenderableWaypoint)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  const routePoints: RouteMapPoint[] = routePolyline
    .filter(isGeoPoint)
    .map((point, index) => ({
      lon: point.lon,
      lat: point.lat,
      slot: Number.isInteger(point.waypointSlot) ? point.waypointSlot! : index,
    }));
  const fallbackRoute: RouteMapPoint[] = validWaypoints.map((waypoint, index) => ({
    lon: waypoint.lon!,
    lat: waypoint.lat!,
    slot: Number.isInteger(waypoint.slot) ? waypoint.slot! : index,
  }));
  const route = routePoints.length > 0 ? routePoints : fallbackRoute;
  const boundsPoints = [...route, ...validWaypoints.map(waypoint => ({ lon: waypoint.lon!, lat: waypoint.lat! }))];
  const maxSlot = Math.max(0, ...route.map(point => point.slot), ...validWaypoints.map(point => point.slot ?? 0));
  const visitedSlot = typeof visitedWaypointSlot === 'number'
    ? Math.max(0, visitedWaypointSlot)
    : maxSlot;
  const project = createRouteProjector(boundsPoints);
  const projectedRoute = route.map(point => ({ ...point, ...project(point.lon, point.lat) }));
  const projectedWaypoints = validWaypoints.map(waypoint => ({
    waypoint,
    ...project(waypoint.lon!, waypoint.lat!),
  }));
  const finalWaypoint = projectedWaypoints.find(({ waypoint }) => waypoint.slot === visitedSlot)
    ?? [...projectedWaypoints].reverse().find(({ waypoint }) => (waypoint.slot ?? 0) <= visitedSlot);
  const finalPoint = finalWaypoint
    ?? [...projectedRoute].reverse().find(point => point.slot <= visitedSlot)
    ?? projectedRoute[projectedRoute.length - 1];
  const gridId = `route-grid-${id}`;
  const bgId = `route-bg-${id}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      className={cn('block h-auto w-full rounded-[inherit]', className)}
    >
      <defs>
        <radialGradient id={bgId} cx="50%" cy="38%" r="78%">
          <stop offset="0%" stopColor="#16233b" />
          <stop offset="100%" stopColor="#03080f" />
        </radialGradient>
        <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0 L0 0 0 24" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} rx="10" fill={`url(#${bgId})`} />
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} rx="10" fill={`url(#${gridId})`} />

      {projectedRoute.length < 2 && (
        <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT / 2} textAnchor="middle" fill="#64748b" fontSize="11">
          Route memory unavailable
        </text>
      )}

      {projectedRoute.slice(0, -1).map((point, index) => {
        const next = projectedRoute[index + 1];
        const traveled = next.slot <= visitedSlot;
        return (
          <g key={`${point.slot}-${index}`}>
            {traveled && (
              <line
                x1={point.x}
                y1={point.y}
                x2={next.x}
                y2={next.y}
                stroke="#38e1e8"
                strokeOpacity="0.24"
                strokeWidth="9"
                strokeLinecap="round"
              />
            )}
            <line
              x1={point.x}
              y1={point.y}
              x2={next.x}
              y2={next.y}
              stroke={traveled ? '#38e1e8' : 'rgba(226,232,240,0.38)'}
              strokeWidth={traveled ? 4 : 2.5}
              strokeLinecap="round"
              strokeDasharray={traveled ? undefined : '7 7'}
            />
          </g>
        );
      })}

      {projectedWaypoints.map(({ waypoint, x, y }) => {
        const slot = waypoint.slot ?? 0;
        const reached = slot <= visitedSlot;
        const color = getWaypointColor(waypoint.waypointType);
        const isBasecamp = slot === 0;
        const labelLeft = x > VIEW_WIDTH - 120;
        return (
          <g key={`${slot}-${waypoint.name ?? 'site'}`}>
            <circle
              cx={x}
              cy={y}
              r={isBasecamp ? 6 : 5}
              fill={color}
              opacity={reached ? 1 : 0.48}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.5"
            />
            {isBasecamp && (
              <path
                d={`M ${x - 7} ${y + 10} L ${x} ${y + 3} L ${x + 7} ${y + 10}`}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {showLabels && waypoint.name && (
              <text
                x={labelLeft ? x - 9 : x + 9}
                y={y - 9}
                textAnchor={labelLeft ? 'end' : 'start'}
                fill={reached ? '#e2e8f0' : '#64748b'}
                fontSize="9"
                fontWeight="700"
              >
                {truncate(`${getWaypointTypeLabel(waypoint.waypointType) ?? 'Site'}: ${waypoint.name}`, 25)}
              </text>
            )}
          </g>
        );
      })}

      {finalPoint && (
        <g transform={`translate(${finalPoint.x} ${finalPoint.y}) scale(0.68)`}>
          <path
            d="M0,-18 L4,-5 L17,-5 L7,2 L11,15 L0,7 L-11,15 L-7,2 L-17,-5 L-4,-5 Z"
            fill={captured ? '#22c55e' : '#facc15'}
            opacity="0.96"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="1.5"
          />
          <circle r="4" fill="rgba(8,12,22,0.92)" />
        </g>
      )}
    </svg>
  );
}

export function createRouteProjector(points: GeoPoint[]) {
  if (points.length === 0) return () => ({ x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 });
  const lons = points.map(point => point.lon);
  const lats = points.map(point => point.lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lonSpan = Math.max(maxLon - minLon, 0.0001);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const scale = Math.min(
    (VIEW_WIDTH - PAD * 2) / lonSpan,
    (VIEW_HEIGHT - TOP_PAD - PAD) / latSpan,
  );
  const routeWidth = lonSpan * scale;
  const routeHeight = latSpan * scale;
  const offsetX = (VIEW_WIDTH - routeWidth) / 2;
  const offsetY = TOP_PAD + (VIEW_HEIGHT - TOP_PAD - routeHeight) / 2;

  return (lon: number, lat: number): ProjectedPoint => ({
    x: offsetX + (lon - minLon) * scale,
    y: offsetY + routeHeight - (lat - minLat) * scale,
  });
}

function isGeoPoint(value: { lon?: number; lat?: number }): boolean {
  return Number.isFinite(value.lon) && Number.isFinite(value.lat);
}

function isRenderableWaypoint(value: ExpeditionWaypointMemory): boolean {
  return isGeoPoint(value);
}

function getWaypointColor(type: string | null | undefined): string {
  return type && type in WAYPOINT_TYPE_COLORS
    ? WAYPOINT_TYPE_COLORS[type as WaypointType]
    : '#38bdf8';
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
