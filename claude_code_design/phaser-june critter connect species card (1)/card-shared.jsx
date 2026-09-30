
// Shared building blocks used by all three card variants.

// Render a polyline through normalized 0..1 space, with margin padding,
// returning both the SVG path data and the normalized endpoints (for dot placement).
function projectRoute(points, width, height, pad = 8) {
  const xs = points.map(p => p.lon);
  const ys = points.map(p => p.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  // Maintain aspect ratio: scale by the smaller of the two so the path doesn't stretch.
  const scaleX = (width  - pad * 2) / dx;
  const scaleY = (height - pad * 2) / dy;
  const scale = Math.min(scaleX, scaleY);
  // Center within the box.
  const usedW = dx * scale;
  const usedH = dy * scale;
  const offX = (width - usedW) / 2;
  const offY = (height - usedH) / 2;
  return points.map(p => ({
    x: offX + (p.lon - minX) * scale,
    y: height - offY - (p.lat - minY) * scale,
  }));
}

// Waypoint node colors — mirror ExpeditionRouteRecap's WAYPOINT_COLORS.
const RM_WP_COLORS = {
  city: "#f59e0b", basecamp: "#f97316", river: "#38bdf8", lake: "#2563eb",
  wetland: "#14b8a6", protected_area: "#22c55e", protected: "#22c55e",
  bioregion_edge: "#a78bfa",
};

// Recap-grade route map for the back of the card.
// Aspect-preserving projection, waypoint nodes colored by type, traveled-vs-planned
// segments, basecamp caret at slot 0, and a capture star at the final reached node.
// Prefers rich `waypoints` (typed + slotted); falls back to a bare `points` polyline.
// `tone` = 'holo' | 'parchment' | 'prism'.
function RouteMap({ points, waypoints, visitedSlot, captured = true, width = 280, height = 180, tone = "holo", iucn }) {
  const src = (waypoints && waypoints.length)
    ? [...waypoints].sort((a, b) => a.slot - b.slot)
    : (points || []).map((p, i) => ({ lon: p.lon, lat: p.lat, slot: i, waypointType: null, name: null }));
  if (src.length < 2) return null;

  const maxSlot = src[src.length - 1].slot;
  const visited = (typeof visitedSlot === "number") ? visitedSlot : maxSlot;
  const projected = projectRoute(src, width, height, 22);
  const nodes = src.map((s, i) => ({ ...s, ...projected[i] }));
  const finalNode = nodes.find(n => n.slot === visited) || nodes[nodes.length - 1];
  const accent = `oklch(72% ${iucn.chroma} ${iucn.hue})`;

  const theme = ({
    holo:      { bg: "url(#rm-bg-holo)",  grid: "rgba(148,163,184,0.12)", traveled: "#38e1e8", planned: "rgba(226,232,240,0.40)", stroke: "rgba(255,255,255,0.9)", caret: "#fbbf24", coreDark: true },
    prism:     { bg: "url(#rm-bg-prism)", grid: "rgba(148,163,184,0.14)", traveled: accent,    planned: "rgba(226,232,240,0.36)", stroke: "rgba(255,255,255,0.9)", caret: "#fbbf24", coreDark: true },
    parchment: { bg: "url(#rm-bg-paper)", grid: "rgba(120,90,50,0.22)",   traveled: "#3a2c14", planned: "rgba(90,70,40,0.55)",    stroke: "#2c1f10",             caret: "#8a5a1a", coreDark: false },
  })[tone] || {};

  const starScale = 0.6;
  const starPath = "M0,-18 L4,-5 L17,-5 L7,2 L11,15 L0,7 L-11,15 L-7,2 L-17,-5 L-4,-5 Z";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <radialGradient id="rm-bg-holo" cx="50%" cy="38%" r="78%">
          <stop offset="0%" stopColor="#16233b" />
          <stop offset="100%" stopColor="#03080f" />
        </radialGradient>
        <linearGradient id="rm-bg-prism" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#0b1220" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <pattern id="rm-bg-paper" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#f2e7c6" />
          <circle cx="1" cy="1" r="0.4" fill="#c9b893" opacity="0.5" />
        </pattern>
        <pattern id="rm-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0 L0 0 0 26" fill="none" stroke={theme.grid} strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={width} height={height} fill={theme.bg} />
      <rect width={width} height={height} fill="url(#rm-grid)" />

      {/* traveled glow underlay (dark tones only) */}
      {theme.coreDark && nodes.slice(0, -1).map((n, i) => {
        const next = nodes[i + 1];
        if (next.slot > visited) return null;
        return <line key={`glow${i}`} x1={n.x} y1={n.y} x2={next.x} y2={next.y}
          stroke={theme.traveled} strokeOpacity="0.28" strokeWidth="7.5" strokeLinecap="round" />;
      })}

      {/* segments: solid+thick when traveled, dashed+muted when only planned */}
      {nodes.slice(0, -1).map((n, i) => {
        const next = nodes[i + 1];
        const traveled = next.slot <= visited;
        return (
          <line key={`seg${i}`} x1={n.x} y1={n.y} x2={next.x} y2={next.y}
            stroke={traveled ? theme.traveled : theme.planned}
            strokeWidth={traveled ? 3.4 : 2}
            strokeLinecap="round"
            strokeDasharray={traveled ? undefined : "6 6"} />
        );
      })}

      {/* waypoint nodes, colored by type; the final reached node is drawn as a star */}
      {nodes.map((n, i) => {
        if (n === finalNode) return null;
        const reached = n.slot <= visited;
        const color = RM_WP_COLORS[n.waypointType] || theme.traveled;
        const isBase = n.slot === 0;
        return (
          <g key={`wp${i}`}>
            <circle cx={n.x} cy={n.y} r={isBase ? 5.5 : 4.2} fill={color}
              opacity={reached ? 1 : 0.5} stroke={theme.stroke} strokeWidth="1.4" />
            {isBase && (
              <path d={`M ${n.x - 6} ${n.y + 8} L ${n.x} ${n.y + 2} L ${n.x + 6} ${n.y + 8}`}
                fill="none" stroke={theme.caret} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>
        );
      })}

      {/* capture star at the final reached point */}
      <g transform={`translate(${finalNode.x} ${finalNode.y}) scale(${starScale})`}>
        <path d={starPath}
          fill={captured ? (RM_WP_COLORS[finalNode.waypointType] || "#22c55e") : "#facc15"}
          opacity="0.96" stroke={theme.stroke} strokeWidth="1.6" />
        <circle r="4" fill={theme.coreDark ? "rgba(8,12,22,0.92)" : "#f7ecca"} />
      </g>
    </svg>
  );
}

// Honest scaffold for the species photo.
// `tone` mirrors the variant; falls back to slate stripes.
function PhotoPlaceholder({ tone = "holo", label = "PHOTO", classLabel, iucn }) {
  const accent = `oklch(72% ${iucn.chroma} ${iucn.hue})`;
  const stripeBase = tone === "parchment" ? "#d8c89a" : "#1e293b";
  const stripeAlt  = tone === "parchment" ? "#c9b482" : "#0f172a";

  return (
    <div className="relative w-full h-full overflow-hidden" style={{
      background: `repeating-linear-gradient(135deg, ${stripeBase} 0px, ${stripeBase} 6px, ${stripeAlt} 6px, ${stripeAlt} 12px)`,
    }}>
      {/* corner crop ticks for that scaffolding feel */}
      {[
        { top: 6, left: 6, b: ["t", "l"] },
        { top: 6, right: 6, b: ["t", "r"] },
        { bottom: 6, left: 6, b: ["b", "l"] },
        { bottom: 6, right: 6, b: ["b", "r"] },
      ].map((pos, i) => (
        <div key={i} className="absolute w-3 h-3" style={{
          top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right,
          borderTop:    pos.b.includes("t") ? `1.5px solid ${accent}` : "none",
          borderBottom: pos.b.includes("b") ? `1.5px solid ${accent}` : "none",
          borderLeft:   pos.b.includes("l") ? `1.5px solid ${accent}` : "none",
          borderRight:  pos.b.includes("r") ? `1.5px solid ${accent}` : "none",
        }} />
      ))}
      {/* center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <div className="text-[9px] tracking-[0.25em] font-mono"
             style={{ color: tone === "parchment" ? "#3f2f1a" : "#94a3b8" }}>
          {label}
        </div>
        {classLabel && (
          <div className="text-[8px] mt-1 font-mono opacity-70"
               style={{ color: tone === "parchment" ? "#5c4321" : "#64748b" }}>
            {classLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// Dimmed silhouette state for undiscovered species.
function UndiscoveredArt({ tone = "holo", iucn }) {
  const accent = `oklch(72% ${iucn.chroma} ${iucn.hue})`;
  const bg = tone === "parchment" ? "#e8dcb8" : "#0a1020";
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center"
         style={{ background: bg }}>
      <div className="absolute inset-0" style={{
        background: `radial-gradient(circle at 50% 45%, ${accent}22 0%, transparent 60%)`,
      }} />
      <div style={{
        fontSize: "92px",
        lineHeight: 1,
        opacity: tone === "parchment" ? 0.18 : 0.12,
        color: tone === "parchment" ? "#3f2f1a" : "#cbd5e1",
        fontWeight: 900,
        fontFamily: "'DM Serif Display', Georgia, serif",
      }}>?</div>
      <div className="absolute bottom-2 left-0 right-0 text-center text-[8px] tracking-[0.25em] font-mono"
           style={{ color: tone === "parchment" ? "#3f2f1a99" : "#64748b" }}>
        UNDISCOVERED
      </div>
    </div>
  );
}

// Used in front-of-card "key facts" slot when the fact hasn't been earned yet.
function RedactedBar({ tone = "holo", width = "70%" }) {
  const dark = tone !== "parchment";
  return (
    <div className="relative h-3.5 rounded-sm overflow-hidden flex-1"
         style={{
           background: dark ? "#1e293b" : "#c9b482",
           border: dark ? "1px solid #334155" : "1px solid #a08960",
         }}>
      <div className="absolute inset-0" style={{
        background: dark
          ? "repeating-linear-gradient(90deg, #334155 0 8px, transparent 8px 14px)"
          : "repeating-linear-gradient(90deg, #1f2937 0 8px, transparent 8px 14px)",
        opacity: 0.5,
      }} />
    </div>
  );
}

Object.assign(window, { projectRoute, RouteMap, PhotoPlaceholder, UndiscoveredArt, RedactedBar });
