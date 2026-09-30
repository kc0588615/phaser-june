// Direction A — "Holo Plate"
// Glassy dark slab with a holographic foil sweep, gem-cut conservation badge in a notched corner,
// oversized serif species name. Modern premium-TCG feel.

function HoloPlateCard({ species, isDiscovered, runMemory, gisStamps, factsUnlocked,
                         clueCategoriesUnlocked, completionPct, foil, flipped, onFlip }) {
  const code = species.conservation_code || "LC";
  const iucn = window.IUCN[code] || window.IUCN.LC;
  const accent = `oklch(72% ${iucn.chroma} ${iucn.hue})`;
  const accentDim = `oklch(48% ${iucn.chroma} ${iucn.hue})`;
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

  return (
    <div className="hp-perspective" style={{ width: 320, height: 480 }}>
      <div className={`hp-flipper ${flipped ? "is-flipped" : ""}`} onClick={onFlip}>
        {/* ====== FRONT ====== */}
        <div className="hp-face hp-front" style={{
          "--accent": accent,
          "--accent-dim": accentDim,
          background: "linear-gradient(180deg, #0b1220 0%, #050a14 100%)",
          border: `1.5px solid ${accent}`,
          boxShadow: `0 0 0 1px #00000099, 0 0 32px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.05)`,
          visibility: flipped ? "hidden" : "visible",
          opacity: flipped ? 0 : 1,
        }}>
          {/* holographic foil sweep */}
          {foil && <div className="hp-foil" />}
          {/* corner notch */}
          <svg className="hp-notch" viewBox="0 0 80 80" width="80" height="80">
            <path d="M0 0 L80 0 L80 24 L24 80 L0 80 Z" fill="rgba(255,255,255,0.02)" />
            <path d="M0 0 L80 0 L80 24 L24 80 L0 80 Z" fill="none" stroke={accent} strokeWidth="1" strokeOpacity="0.6" />
          </svg>

          {/* IUCN gem badge in the notch */}
          <div className="hp-iucn">
            <div className="hp-iucn-gem" style={{
              background: `linear-gradient(135deg, ${accent} 0%, ${accentDim} 100%)`,
              boxShadow: `0 0 16px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.45)`,
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>{code}</span>
            </div>
            <div className="hp-iucn-label">{iucn.label}</div>
          </div>

          {/* class chip top-right */}
          <div className="hp-class">
            <span className="hp-class-emoji">{emoji}</span>
            <span className="hp-class-label">{classLabel}</span>
          </div>

          {/* art window */}
          <div className="hp-art" style={{ borderColor: `${accent}55`, boxShadow: `0 0 24px ${accent}33` }}>
            {isDiscovered
              ? <PhotoPlaceholder tone="holo" iucn={iucn} classLabel={classLabel.toUpperCase()} />
              : <UndiscoveredArt tone="holo" iucn={iucn} />}
            <div className="hp-art-scanline" />
          </div>

          {/* name plate */}
          <div className="hp-name">
            {isDiscovered ? (
              <>
                <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                  {species.common_name || species.scientific_name}
                </h2>
                <p>{species.scientific_name}</p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: "#475569" }}>
                  Unidentified
                </h2>
                <p style={{ color: "#334155" }}>Pending field study</p>
              </>
            )}
          </div>

          {/* facts */}
          <div className="hp-facts">
            {facts.map((f, i) => {
              const isUnlocked = isDiscovered && f.text && unlocked.has(f.key);
              return (
                <div key={f.key} className="hp-fact">
                  <span className="hp-fact-num" style={{ color: accent }}>0{i + 1}</span>
                  {isUnlocked ? (
                    <span className="hp-fact-text">{f.text}</span>
                  ) : (
                    <RedactedBar tone="holo" />
                  )}
                </div>
              );
            })}
          </div>

          {/* footer */}
          <div className="hp-footer" style={{ borderTopColor: `${accent}33` }}>
            <div className="hp-footer-left">
              {species.family && <span className="hp-pill">{species.family}</span>}
              {species.terrestrial && <span className="hp-pill hp-pill-land">Land</span>}
              {species.freshwater  && <span className="hp-pill hp-pill-fresh">Fresh</span>}
              {species.marine      && <span className="hp-pill hp-pill-marine">Marine</span>}
            </div>
            <div className="hp-footer-right">
              {typeof completionPct === "number" && (
                <span style={{ color: accent }}>{Math.round(completionPct)}%</span>
              )}
              <span style={{ opacity: 0.6 }}>#{String(species.id).padStart(4, "0")}</span>
            </div>
          </div>
        </div>

        {/* ====== BACK ====== */}
        <div className="hp-face hp-back" style={{
          "--accent": accent,
          background: "linear-gradient(180deg, #0b1220 0%, #050a14 100%)",
          border: `1.5px solid ${accent}`,
          boxShadow: `0 0 0 1px #00000099, 0 0 32px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.05)`,
          visibility: flipped ? "visible" : "hidden",
          opacity: flipped ? 1 : 0,
        }}>
          {foil && <div className="hp-foil" />}

          <div className="hp-back-header">
            <div>
              <div className="hp-back-eyebrow" style={{ color: accent }}>EXPEDITION MEMORY</div>
              <div className="hp-back-region">{runMemory?.bioregion || "Unknown Region"}</div>
              <div className="hp-back-biome">{runMemory?.biome}</div>
            </div>
            <div className="hp-back-score" style={{ color: accent }}>
              <div className="hp-score-num" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {runMemory?.finalScore?.toLocaleString() || "—"}
              </div>
              <div className="hp-score-lbl">PTS</div>
            </div>
          </div>

          {/* HERO route map */}
          <div className="hp-route-hero" style={{ borderColor: `${accent}55`, boxShadow: `0 0 24px ${accent}22` }}>
            <RouteMap points={runMemory.routePolyline} waypoints={runMemory.waypoints}
                      visitedSlot={runMemory.visitedWaypointSlot} captured={runMemory.captured}
                      width={280} height={178} tone="holo" iucn={iucn} />
            <div className="hp-route-corners">
              <span style={{ color: accent }}>↖ {runMemory.nodes[0]?.waypoint?.name}</span>
              <span style={{ color: accent }}>{runMemory.nodes[runMemory.nodes.length - 1]?.waypoint?.name} ↘</span>
            </div>
            <div className="hp-route-scanline" />
          </div>

          {/* Waypoint timeline */}
          <div className="hp-back-section">
            <div className="hp-section-label" style={{ color: accent }}>WAYPOINTS · {runMemory.nodes.length} STOPS</div>
            <div className="hp-waypoints">
              {runMemory.nodes.map((node, i) => {
                const c = window.WAYPOINT_TYPE_COLOR[node.waypoint?.waypointType] || "#94a3b8";
                return (
                  <div key={i} className="hp-wp">
                    <span className="hp-wp-dot" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                    <span className="hp-wp-name">{node.waypoint?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress + stamps + clues compressed */}
          <div className="hp-back-bottom">
            <div>
              <div className="hp-section-label" style={{ color: accent }}>PROGRESS</div>
              <div className="hp-progress">
                <div className="hp-progress-fill" style={{
                  width: `${completionPct || 0}%`,
                  background: `linear-gradient(90deg, ${accentDim}, ${accent})`,
                  boxShadow: `0 0 8px ${accent}`,
                }} />
              </div>
              <div className="hp-progress-text">{completionPct || 0}% complete</div>
            </div>

            <div className="hp-stamps">
              {(gisStamps || []).map(fc => {
                const b = window.GIS_BADGES[fc];
                return b ? (
                  <span key={fc} className="hp-stamp" title={b.label}>{b.icon}</span>
                ) : null;
              })}
            </div>
          </div>

          <div className="hp-back-footer">
            <div className="hp-clues">
              {Object.entries(window.CLUE_CATEGORIES).map(([key, c]) => {
                const on = unlockedCats.has(key);
                return (
                  <span key={key} className={`hp-clue ${on ? "is-on" : ""}`}
                        style={on ? { color: accent, borderColor: `${accent}77` } : {}}
                        title={c.label}>
                    {c.label}
                  </span>
                );
              })}
            </div>
            <div className="hp-back-date">
              {runMemory?.startedAt && new Date(runMemory.startedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HoloPlateCard = HoloPlateCard;
