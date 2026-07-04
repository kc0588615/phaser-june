import type { RoutePoint } from '@/lib/expeditionRoute';
import { getWaypointTypeLabel, type ExpeditionWaypoint, type WaypointType } from '@/types/waypoints';

const WAYPOINT_COLORS: Record<WaypointType, string> = {
  city: '#f59e0b',
  river: '#38bdf8',
  lake: '#2563eb',
  wetland: '#14b8a6',
  protected_area: '#22c55e',
  bioregion_edge: '#a78bfa',
  basecamp: '#f97316',
};

const VIEW_WIDTH = 360;
const VIEW_HEIGHT = 230;
const PAD = 28;

interface ExpeditionRouteRecapProps {
  waypoints: ExpeditionWaypoint[];
  routePolyline?: RoutePoint[];
  visitedWaypointSlot: number;
  captured: boolean;
  speciesName: string;
}

interface ProjectedPoint {
  x: number;
  y: number;
}

export function ExpeditionRouteRecap({
  waypoints,
  routePolyline = [],
  visitedWaypointSlot,
  captured,
  speciesName,
}: ExpeditionRouteRecapProps) {
  const sortedWaypoints = [...waypoints].sort((a, b) => a.slot - b.slot);
  const sourcePoints = routePolyline.length > 0
    ? routePolyline.map((point, index) => ({
        lon: point.lon,
        lat: point.lat,
        slot: Number.isInteger(point.waypointSlot) ? point.waypointSlot! : index,
      }))
    : sortedWaypoints.map(waypoint => ({
        lon: waypoint.lon,
        lat: waypoint.lat,
        slot: waypoint.slot,
      }));

  if (sourcePoints.length === 0) return null;

  const project = createProjector(sourcePoints);
  const routePoints = sourcePoints.map(point => ({ ...point, ...project(point.lon, point.lat) }));
  const waypointPoints = sortedWaypoints.map(waypoint => ({
    waypoint,
    ...project(waypoint.lon, waypoint.lat),
  }));
  const finalWaypoint = sortedWaypoints.find(waypoint => waypoint.slot === visitedWaypointSlot)
    ?? sortedWaypoints[Math.min(visitedWaypointSlot, Math.max(0, sortedWaypoints.length - 1))]
    ?? sortedWaypoints[0];
  const finalPoint = finalWaypoint
    ? project(finalWaypoint.lon, finalWaypoint.lat)
    : routePoints.find(point => point.slot === visitedWaypointSlot) ?? routePoints[0];
  const finalName = finalWaypoint?.name ?? 'field site';
  const species = speciesName || 'Mystery species';

  return (
    <div className="w-full max-w-[360px] rounded-lg border border-ds-subtle bg-ds-surface/80 p-2.5 shadow-card">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={`Expedition route recap for ${species}`}
        className="block h-auto max-h-[320px] w-full"
      >
        <defs>
          <pattern id="recap-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="1" />
          </pattern>
          <filter id="recap-paper">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.08" />
            </feComponentTransfer>
          </filter>
        </defs>

        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} rx="10" fill="rgba(15,23,42,0.9)" />
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} rx="10" fill="url(#recap-grid)" />
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} rx="10" filter="url(#recap-paper)" opacity="0.35" />

        <text x="16" y="24" fill="var(--ds-text-primary)" fontSize="13" fontWeight="700">
          Expedition route
        </text>
        <text x="16" y="41" fill="var(--ds-text-muted)" fontSize="10">
          {captured ? `${species} captured here` : `Last seen near ${truncate(finalName, 24)}`}
        </text>

        {routePoints.slice(0, -1).map((point, index) => {
          const next = routePoints[index + 1];
          const traveled = next.slot <= visitedWaypointSlot;
          return (
            <line
              key={`${point.slot}-${index}`}
              x1={point.x}
              y1={point.y}
              x2={next.x}
              y2={next.y}
              stroke={traveled ? 'var(--ds-accent-cyan)' : 'rgba(226,232,240,0.46)'}
              strokeWidth={traveled ? 4 : 2.5}
              strokeLinecap="round"
              strokeDasharray={traveled ? undefined : '7 7'}
            />
          );
        })}

        {waypointPoints.map(({ waypoint, x, y }) => {
          const reached = waypoint.slot <= visitedWaypointSlot;
          const color = WAYPOINT_COLORS[waypoint.waypointType] ?? '#38bdf8';
          const labelLeft = x > VIEW_WIDTH - 110;
          const labelX = labelLeft ? x - 8 : x + 8;
          return (
            <g key={`${waypoint.slot}-${waypoint.name}`}>
              <circle
                cx={x}
                cy={y}
                r={waypoint.slot === 0 ? 6 : 5}
                fill={color}
                opacity={reached ? 1 : 0.52}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.5"
              />
              {waypoint.slot === 0 && (
                <path
                  d={`M ${x - 7} ${y + 9} L ${x} ${y + 2} L ${x + 7} ${y + 9}`}
                  fill="none"
                  stroke="var(--ds-accent-amber)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <text
                x={labelX}
                y={y - 8}
                textAnchor={labelLeft ? 'end' : 'start'}
                fill={reached ? 'var(--ds-text-primary)' : 'var(--ds-text-muted)'}
                fontSize="9"
                fontWeight="700"
              >
                {truncate(`${getWaypointTypeLabel(waypoint.waypointType) ?? 'Site'}: ${waypoint.name}`, 22)}
              </text>
            </g>
          );
        })}

        <g transform={`translate(${finalPoint.x} ${finalPoint.y})`}>
          <path
            d="M0,-18 L4,-5 L17,-5 L7,2 L11,15 L0,7 L-11,15 L-7,2 L-17,-5 L-4,-5 Z"
            fill={captured ? 'var(--ds-accent-emerald)' : 'var(--ds-accent-amber)'}
            opacity="0.9"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="1"
          />
          <circle r="4" fill="rgba(10,14,26,0.92)" />
        </g>
      </svg>
    </div>
  );
}

function createProjector(points: Array<{ lon: number; lat: number }>) {
  const lons = points.map(point => point.lon);
  const lats = points.map(point => point.lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lonSpan = Math.max(maxLon - minLon, 0.0001);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const scale = Math.min((VIEW_WIDTH - PAD * 2) / lonSpan, (VIEW_HEIGHT - PAD * 2 - 34) / latSpan);
  const routeWidth = lonSpan * scale;
  const routeHeight = latSpan * scale;
  const offsetX = (VIEW_WIDTH - routeWidth) / 2;
  const offsetY = 54 + (VIEW_HEIGHT - 54 - PAD - routeHeight) / 2;

  return (lon: number, lat: number): ProjectedPoint => ({
    x: offsetX + (lon - minLon) * scale,
    y: offsetY + routeHeight - (lat - minLat) * scale,
  });
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
