// Direction C — "Specimen Prism"
// Bold gem-cut polygonal frame with chromatic aberration on the rarity halo.
// Faceted angular borders, monospace data ribbon footer, holographic class sticker.
// Most "card pack you just opened" energy.

function SpecimenPrismCard({ species, isDiscovered, runMemory, gisStamps, factsUnlocked,
                             clueCategoriesUnlocked, completionPct, foil, flipped, onFlip }) {
  const code = species.conservation_code || "LC";
  const iucn = window.IUCN[code] || window.IUCN.LC;
  const accent = `oklch(72% ${iucn.chroma} ${iucn.hue})`;
  const accentDim = `oklch(38% ${iucn.chroma} ${iucn.hue})`;
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

  // Polygonal clip-path — gem-cut card silhouette
  const clip = "polygon(24px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 12px 100%, 0 calc(100% - 12px), 0 24px)";

  return (
    <div className="sp-perspective" style={{ width: 320, height: 480 }}>
      <div className={`sp-flipper ${flipped ? "is-flipped" : ""}`} onClick={onFlip}>
        {/* ====== FRONT ====== */}
        <div className="sp-face sp-front" style={{
          "--accent": accent,
          "--accent-dim": accentDim,
          clipPath: clip,
          visibility: flipped ? "hidden" : "visible",
          opacity: flipped ? 0 : 1,
        }}>
          {/* chromatic halo layers (offset duplicates of the border) */}
          <div className="sp-halo sp-halo-r" style={{ clipPath: clip }} />
          <div className="sp-halo sp-halo-b" style={{ clipPath: clip }} />

          {/* main body */}
          <div className="sp-body" style={{ clipPath: clip }}>
            {foil && <div className="sp-foil" />}

            {/* faceted background */}
            <svg className="sp-facets" viewBox="0 0 320 480" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sp-grad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width="320" height="480" fill="#040814" />
              <polygon points="0,0 200,0 0,180" fill={accent} fillOpacity="0.06" />
              <polygon points="320,0 320,140 220,0" fill={accent} fillOpacity="0.04" />
              <polygon points="320,480 320,320 180,480" fill={accent} fillOpacity="0.05" />
              <polygon points="0,480 0,360 140,480" fill={accent} fillOpacity="0.04" />
              <polygon points="0,180 320,140 320,320 0,360" fill="url(#sp-grad)" />
            </svg>

            {/* gem-cut border (drawn as path) */}
            <svg className="sp-border" viewBox="0 0 320 480">
              <path d="M24 1 L308 1 L319 12 L319 456 L296 479 L12 479 L1 468 L1 24 Z"
                    fill="none" stroke={accent} strokeWidth="1.5" />
              <path d="M24 1 L308 1 L319 12 L319 456 L296 479 L12 479 L1 468 L1 24 Z"
                    fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="3" />
            </svg>

            {/* top ribbon */}
            <div className="sp-top">
              <div className="sp-iucn" style={{
                background: `linear-gradient(135deg, ${accent}, ${accentDim})`,
                boxShadow: `0 0 14px ${accent}aa`,
              }}>
                <span className="sp-iucn-code">{code}</span>
              </div>
              <div className="sp-classifier">
                <div className="sp-class-row">
                  <span className="sp-class-emoji">{emoji}</span>
                  <span className="sp-class-label">{classLabel.toUpperCase()}</span>
                </div>
                <div className="sp-class-sub">{species.family || "—"}</div>
              </div>
              <div className="sp-id-block" style={{ borderColor: `${accent}55` }}>
                <span style={{ color: accent, fontSize: 7, letterSpacing: "0.2em" }}>ID</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                  {String(species.id).padStart(4, "0")}
                </span>
              </div>
            </div>

            {/* art window — angular */}
            <div className="sp-art" style={{
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)",
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 18px ${accent}33`,
            }}>
              {isDiscovered
                ? <PhotoPlaceholder tone="prism" iucn={iucn} classLabel={classLabel.toUpperCase()} />
                : <UndiscoveredArt tone="holo" iucn={iucn} />}
              {/* facet shimmer overlay */}
              <div className="sp-art-shimmer" />
            </div>

            {/* name plate */}
            <div className="sp-name">
              {isDiscovered ? (
                <>
                  <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                    {species.common_name}
                  </h2>
                  <p>{species.scientific_name}</p>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: "#475569" }}>???</h2>
                  <p style={{ color: "#334155" }}>UNCLASSIFIED</p>
                </>
              )}
            </div>

            {/* facts */}
            <div className="sp-facts">
              {facts.map((f, i) => {
                const isUnlocked = isDiscovered && f.text && unlocked.has(f.key);
                return (
                  <div key={f.key} className="sp-fact">
                    <span className="sp-fact-marker" style={{ background: accent }} />
                    {isUnlocked ? (
                      <span className="sp-fact-text">{f.text}</span>
                    ) : (
                      <RedactedBar tone="holo" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* mono data ribbon footer */}
            <div className="sp-ribbon" style={{ background: `linear-gradient(90deg, ${accentDim}, transparent)` }}>
              <div className="sp-ribbon-row">
                <span style={{ color: accent }}>FAM</span>
                <span>{species.family?.toUpperCase().slice(0, 8) || "—"}</span>
                <span style={{ color: accent }}>HAB</span>
                <span>
                  {[species.terrestrial && "LND", species.freshwater && "FRW", species.marine && "MAR"]
                    .filter(Boolean).join("·")}
                </span>
                <span style={{ color: accent }}>{Math.round(completionPct || 0)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ====== BACK ====== */}
        <div className="sp-face sp-back" style={{
          "--accent": accent,
          clipPath: clip,
          visibility: flipped ? "visible" : "hidden",
          opacity: flipped ? 1 : 0,
        }}>
          <div className="sp-halo sp-halo-r" style={{ clipPath: clip }} />
          <div className="sp-halo sp-halo-b" style={{ clipPath: clip }} />

          <div className="sp-body" style={{ clipPath: clip }}>
            {foil && <div className="sp-foil" />}

            <svg className="sp-border" viewBox="0 0 320 480">
              <path d="M24 1 L308 1 L319 12 L319 456 L296 479 L12 479 L1 468 L1 24 Z"
                    fill="none" stroke={accent} strokeWidth="1.5" />
            </svg>

            {/* header */}
            <div className="sp-back-top">
              <div>
                <div className="sp-eyebrow" style={{ color: accent }}>▶ EXPEDITION LOG</div>
                <div className="sp-region" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                  {runMemory.bioregion}
                </div>
                <div className="sp-biome">{runMemory.biome}</div>
              </div>
              <div className="sp-score-block" style={{
                clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
                background: `linear-gradient(135deg, ${accentDim}, transparent)`,
                border: `1px solid ${accent}66`,
              }}>
                <div style={{ color: accent, fontSize: 7, letterSpacing: "0.2em" }}>FINAL SCORE</div>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, lineHeight: 1, color: "#fff" }}>
                  {runMemory.finalScore.toLocaleString()}
                </div>
              </div>
            </div>

            {/* HERO route map */}
            <div className="sp-route-hero" style={{
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 24px ${accent}33`,
            }}>
              <RouteMap points={runMemory.routePolyline} waypoints={runMemory.waypoints}
                        visitedSlot={runMemory.visitedWaypointSlot} captured={runMemory.captured}
                        width={280} height={178} tone="prism" iucn={iucn} />
              <div className="sp-route-tags">
                <span style={{ color: "#facc15" }}>● {runMemory.nodes[0]?.waypoint?.name}</span>
                <span style={{ color: "#22c55e" }}>{runMemory.nodes[runMemory.nodes.length - 1]?.waypoint?.name} ●</span>
              </div>
            </div>

            {/* waypoint chips — diamond chips */}
            <div className="sp-back-section">
              <div className="sp-back-label" style={{ color: accent }}>◇ {runMemory.nodes.length} WAYPOINTS</div>
              <div className="sp-waypoints">
                {runMemory.nodes.map((node, i) => {
                  const c = window.WAYPOINT_TYPE_COLOR[node.waypoint?.waypointType] || "#94a3b8";
                  return (
                    <div key={i} className="sp-wp">
                      <span className="sp-wp-diamond" style={{ background: c, boxShadow: `0 0 6px ${c}aa` }} />
                      <span className="sp-wp-name">{node.waypoint?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* clue categories grid */}
            <div className="sp-back-section">
              <div className="sp-back-label" style={{ color: accent }}>◇ CLUE TRACKS</div>
              <div className="sp-clues">
                {Object.entries(window.CLUE_CATEGORIES).map(([key, c]) => {
                  const on = unlockedCats.has(key);
                  return (
                    <span key={key} className={`sp-clue ${on ? "is-on" : ""}`}
                          style={on ? { color: accent, borderColor: accent, background: `${accent}11` } : {}}>
                      {c.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* progress + stamps */}
            <div className="sp-bottom-row">
              <div className="sp-progress-block">
                <div className="sp-progress-row">
                  <span style={{ color: accent, fontSize: 8, letterSpacing: "0.2em" }}>CARD</span>
                  <span style={{ color: "#fff", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                    {completionPct || 0}%
                  </span>
                </div>
                <div className="sp-progress">
                  <div className="sp-progress-fill" style={{
                    width: `${completionPct || 0}%`,
                    background: `linear-gradient(90deg, ${accentDim}, ${accent})`,
                    boxShadow: `0 0 8px ${accent}`,
                  }} />
                </div>
              </div>
              <div className="sp-stamps">
                {(gisStamps || []).slice(0, 5).map(fc => {
                  const b = window.GIS_BADGES[fc];
                  return b ? <span key={fc} className="sp-stamp" title={b.label}>{b.icon}</span> : null;
                })}
              </div>
            </div>

            <div className="sp-ribbon" style={{ background: `linear-gradient(90deg, ${accentDim}, transparent)` }}>
              <div className="sp-ribbon-row">
                <span style={{ color: accent }}>LOG</span>
                <span>
                  {runMemory?.startedAt && new Date(runMemory.startedAt).toISOString().slice(0, 10).replace(/-/g, ".")}
                </span>
                <span style={{ color: accent }}>SPECIMEN</span>
                <span>{String(species.id).padStart(4, "0")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SpecimenPrismCard = SpecimenPrismCard;
