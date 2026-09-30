// Direction B — "Wax Seal"
// Field-journal × premium TCG. Off-white parchment with deckle edges, wax-seal IUCN badge,
// hand-cut tape on the photo plate. The route on the back is a big inked map.

function WaxSealCard({ species, isDiscovered, runMemory, gisStamps, factsUnlocked,
                       clueCategoriesUnlocked, completionPct, foil, flipped, onFlip }) {
  const code = species.conservation_code || "LC";
  const iucn = window.IUCN[code] || window.IUCN.LC;
  const wax = `oklch(48% ${iucn.chroma} ${iucn.hue})`;
  const waxHi = `oklch(64% ${iucn.chroma} ${iucn.hue})`;
  const classKey = species.class || "";
  const emoji = window.CLASS_EMOJI[classKey] || "🐾";
  const classLabel = window.CLASS_LABEL[classKey] || "Animal";
  const unlocked = new Set(factsUnlocked || []);
  const unlockedCats = new Set(clueCategoriesUnlocked || []);

  const facts = [
    { key: "key_fact_1", text: species.key_fact_1 },
    { key: "key_fact_2", text: species.key_fact_2 },
    { key: "key_fact_3", text: species.key_fact_3 },
  ];

  const paperBg = `
    radial-gradient(circle at 18% 12%, #fbf4dd 0%, transparent 35%),
    radial-gradient(circle at 82% 78%, #f0e3b8 0%, transparent 40%),
    linear-gradient(180deg, #f7ecca 0%, #ecdca6 100%)
  `;

  return (
    <div className="ws-perspective" style={{ width: 320, height: 480 }}>
      <div className={`ws-flipper ${flipped ? "is-flipped" : ""}`} onClick={onFlip}>
        {/* ====== FRONT ====== */}
        <div className="ws-face ws-front" style={{
          background: paperBg,
          boxShadow: `0 0 0 2px #1f1404, 0 18px 40px rgba(0,0,0,0.45), 0 0 32px ${wax}55`,
          visibility: flipped ? "hidden" : "visible",
          opacity: flipped ? 0 : 1,
        }}>
          {foil && <div className="ws-foil" />}
          <div className="ws-paper-grain" />

          {/* deckle / torn edge */}
          <svg className="ws-deckle" viewBox="0 0 320 480" preserveAspectRatio="none">
            <path d="M0 12 Q5 8 10 12 T20 12 T30 12 T40 12 T50 12 T60 12 T70 12 T80 12 T90 12 T100 12 T110 12 T120 12 T130 12 T140 12 T150 12 T160 12 T170 12 T180 12 T190 12 T200 12 T210 12 T220 12 T230 12 T240 12 T250 12 T260 12 T270 12 T280 12 T290 12 T300 12 T310 12 T320 12 L320 0 L0 0 Z" fill="#fdf6df" />
            <path d="M0 468 Q5 472 10 468 T20 468 T30 468 T40 468 T50 468 T60 468 T70 468 T80 468 T90 468 T100 468 T110 468 T120 468 T130 468 T140 468 T150 468 T160 468 T170 468 T180 468 T190 468 T200 468 T210 468 T220 468 T230 468 T240 468 T250 468 T260 468 T270 468 T280 468 T290 468 T300 468 T310 468 T320 468 L320 480 L0 480 Z" fill="#fdf6df" />
          </svg>

          {/* journal header */}
          <div className="ws-header">
            <div className="ws-header-line" />
            <div className="ws-stamp">FIELD&nbsp;LOG · ENTRY #{String(species.id).padStart(4, "0")}</div>
            <div className="ws-header-line" />
          </div>

          {/* Wax seal IUCN badge */}
          <div className="ws-wax-wrapper">
            <div className="ws-wax" style={{
              background: `radial-gradient(circle at 35% 30%, ${waxHi} 0%, ${wax} 50%, oklch(28% ${iucn.chroma} ${iucn.hue}) 100%)`,
              boxShadow: `0 4px 8px rgba(0,0,0,0.4), inset -2px -3px 4px rgba(0,0,0,0.35), inset 2px 2px 4px rgba(255,255,255,0.25)`,
            }}>
              <div className="ws-wax-inner">
                <div className="ws-wax-code">{code}</div>
              </div>
            </div>
            <div className="ws-wax-label">{iucn.label.toUpperCase()}</div>
          </div>

          {/* art window with tape */}
          <div className="ws-art-wrap">
            <div className="ws-tape ws-tape-l" />
            <div className="ws-tape ws-tape-r" />
            <div className="ws-art">
              {isDiscovered
                ? <PhotoPlaceholder tone="parchment" iucn={iucn} classLabel={classLabel.toUpperCase()} />
                : <UndiscoveredArt tone="parchment" iucn={iucn} />}
            </div>
            <div className="ws-art-caption">
              {isDiscovered ? `Plate ${String(species.id).padStart(3, "0")} · ${classLabel}` : "Specimen pending identification"}
            </div>
          </div>

          {/* name plate, handwritten */}
          <div className="ws-name">
            {isDiscovered ? (
              <>
                <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                  {species.common_name}
                </h2>
                <p>{species.scientific_name}</p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: "#8a7754" }}>???</h2>
                <p style={{ color: "#a89674" }}>Awaiting field identification</p>
              </>
            )}
          </div>

          {/* facts */}
          <div className="ws-facts">
            {facts.map((f, i) => {
              const isUnlocked = isDiscovered && f.text && unlocked.has(f.key);
              return (
                <div key={f.key} className="ws-fact">
                  <span className="ws-fact-num">§{i + 1}</span>
                  {isUnlocked ? (
                    <span className="ws-fact-text">{f.text}</span>
                  ) : (
                    <RedactedBar tone="parchment" />
                  )}
                </div>
              );
            })}
          </div>

          {/* footer */}
          <div className="ws-footer">
            <div className="ws-footer-left">
              {species.family && <span className="ws-tag">{species.family}</span>}
              {species.terrestrial && <span className="ws-tag">Land</span>}
              {species.freshwater  && <span className="ws-tag">Fresh</span>}
              {species.marine      && <span className="ws-tag">Marine</span>}
            </div>
            <div className="ws-footer-right">
              {typeof completionPct === "number" && <span>{Math.round(completionPct)}%</span>}
            </div>
          </div>
        </div>

        {/* ====== BACK ====== */}
        <div className="ws-face ws-back" style={{
          background: paperBg,
          boxShadow: `0 0 0 2px #1f1404, 0 18px 40px rgba(0,0,0,0.45), 0 0 32px ${wax}55`,
          visibility: flipped ? "visible" : "hidden",
          opacity: flipped ? 1 : 0,
        }}>
          {foil && <div className="ws-foil" />}
          <div className="ws-paper-grain" />

          <div className="ws-back-header">
            <div>
              <div className="ws-eyebrow">EXPEDITION · ROUTE LOG</div>
              <div className="ws-region" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {runMemory.bioregion}
              </div>
              <div className="ws-biome">{runMemory.biome}</div>
            </div>
            <div className="ws-back-stamp">
              <div className="ws-back-stamp-inner" style={{ borderColor: wax, color: wax }}>
                <div style={{ fontSize: 7, letterSpacing: "0.2em" }}>SCORE</div>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, lineHeight: 1 }}>
                  {runMemory.finalScore.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* HERO map - inked */}
          <div className="ws-route-hero">
            <RouteMap points={runMemory.routePolyline} waypoints={runMemory.waypoints}
                      visitedSlot={runMemory.visitedWaypointSlot} captured={runMemory.captured}
                      width={280} height={180} tone="parchment" iucn={iucn} />
            <div className="ws-route-corners">
              <span>{runMemory.nodes[0]?.waypoint?.name}</span>
              <span>{runMemory.nodes[runMemory.nodes.length - 1]?.waypoint?.name}</span>
            </div>
          </div>

          {/* waypoint list — handwritten */}
          <div className="ws-back-section">
            <div className="ws-back-label">— Itinerary —</div>
            <ol className="ws-waypoints">
              {runMemory.nodes.map((node, i) => {
                const c = window.WAYPOINT_TYPE_COLOR[node.waypoint?.waypointType] || "#5b8a7a";
                return (
                  <li key={i}>
                    <span className="ws-wp-num">{i + 1}.</span>
                    <span className="ws-wp-dot" style={{ background: c }} />
                    <span className="ws-wp-name">{node.waypoint?.name}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="ws-back-bottom">
            <div className="ws-back-label">— Evidence —</div>
            <div className="ws-stamps">
              {(gisStamps || []).map(fc => {
                const b = window.GIS_BADGES[fc];
                return b ? (
                  <span key={fc} className="ws-stamp-chip" style={{ borderColor: wax, color: wax }}>
                    <span>{b.icon}</span> {b.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>

          <div className="ws-progress-row">
            <div className="ws-progress-bar">
              <div className="ws-progress-fill" style={{ width: `${completionPct || 0}%`, background: wax }} />
            </div>
            <div className="ws-progress-pct">{completionPct || 0}%</div>
          </div>

          <div className="ws-back-footer">
            <span>{runMemory?.startedAt && new Date(runMemory.startedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
            <span>— Plate {String(species.id).padStart(4, "0")} —</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.WaxSealCard = WaxSealCard;
