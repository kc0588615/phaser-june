// Main app: phone-frame stage, variant switcher, Tweaks panel.

const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "variant": "holo",
  "rarity": "NT",
  "state": "discovered",
  "foil": true,
  "showBack": false,
  "present": "capture",
  "stackFan": true,
  "completion": 78
}/*EDITMODE-END*/;

const VARIANTS = [
  { id: "holo",  label: "Holo Plate",      Component: window.HoloPlateCard },
  { id: "wax",   label: "Wax Seal",        Component: window.WaxSealCard },
  { id: "prism", label: "Specimen Prism",  Component: window.SpecimenPrismCard },
];

function App() {
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [flipped, setFlipped] = useState(tweaks.showBack);

  // Sync external "showBack" tweak → local flip state, but keep local tap-to-flip working too.
  useEffect(() => { setFlipped(tweaks.showBack); }, [tweaks.showBack]);

  const variant = VARIANTS.find(v => v.id === tweaks.variant) || VARIANTS[0];
  const Component = variant.Component;
  const iucnAccent = window.IUCN[tweaks.rarity] || window.IUCN.LC;
  const accent = `oklch(72% ${iucnAccent.chroma} ${iucnAccent.hue})`;

  // Build species + memory based on tweaks
  const { species, isDiscovered, factsUnlocked, clueCategoriesUnlocked, gisStamps, completionPct } = useMemo(() => {
    const base = tweaks.state === "undiscovered"
      ? { ...window.UNKNOWN_SPECIES, conservation_code: tweaks.rarity }
      : { ...window.SAMPLE_SPECIES, conservation_code: tweaks.rarity };
    const discovered = tweaks.state !== "undiscovered";
    return {
      species: base,
      isDiscovered: discovered,
      factsUnlocked: discovered ? window.FACTS_UNLOCKED_FULL : [],
      clueCategoriesUnlocked: discovered ? window.CLUE_CATEGORIES_FULL : [],
      gisStamps: discovered ? window.GIS_STAMPS : [],
      completionPct: discovered ? tweaks.completion : 0,
    };
  }, [tweaks.state, tweaks.rarity, tweaks.completion]);

  const handleFlip = () => setFlipped(f => !f);

  // Cycle variants with arrow keys for quick comparison
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches("input, textarea, select")) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const idx = VARIANTS.findIndex(v => v.id === tweaks.variant);
        const next = e.key === "ArrowRight"
          ? (idx + 1) % VARIANTS.length
          : (idx - 1 + VARIANTS.length) % VARIANTS.length;
        setTweak("variant", VARIANTS[next].id);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      } else if (e.key === "f" || e.key === "F") {
        setTweak("foil", !tweaks.foil);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tweaks.variant, tweaks.foil]);

  const cardProps = {
    species,
    isDiscovered,
    runMemory: window.RUN_MEMORY,
    gisStamps,
    factsUnlocked,
    clueCategoriesUnlocked,
    completionPct,
    foil: tweaks.foil,
    flipped,
    onFlip: handleFlip,
  };

  const idx = VARIANTS.findIndex(v => v.id === tweaks.variant);
  const prevVariant = () => setTweak("variant", VARIANTS[(idx - 1 + VARIANTS.length) % VARIANTS.length].id);
  const nextVariant = () => setTweak("variant", VARIANTS[(idx + 1) % VARIANTS.length].id);

  return (
    <div className="stage">
      <div className="stage-bg-noise" />

      {/* Top toolbar — variant tabs */}
      <div className="toolbar">
        {VARIANTS.map(v => (
          <button key={v.id}
                  className={tweaks.variant === v.id ? "is-active" : ""}
                  onClick={() => setTweak("variant", v.id)}>
            {v.label}
          </button>
        ))}
        <span className="toolbar-divider" />
        <button onClick={handleFlip} title="Tap card or press Space">
          {flipped ? "Show front" : "Show back"}
        </button>
      </div>

      <button className="nav-arrow left"  onClick={prevVariant} aria-label="Previous direction">‹</button>
      <button className="nav-arrow right" onClick={nextVariant} aria-label="Next direction">›</button>

      {/* The card — presented either as an album stack or as the capture reward */}
      {tweaks.present === "capture" ? (
        <CaptureFrame runMemory={window.RUN_MEMORY} accent={accent} isDiscovered={isDiscovered}>
          <Component {...cardProps} />
        </CaptureFrame>
      ) : tweaks.stackFan ? (
        <div className="card-stack">
          <div className="stack-card behind-2">
            <FannedSilhouette variant={tweaks.variant} rarity={tweaks.rarity} />
          </div>
          <div className="stack-card behind-1">
            <FannedSilhouette variant={tweaks.variant} rarity={tweaks.rarity} />
          </div>
          <div className="stack-card front">
            <Component {...cardProps} />
          </div>
        </div>
      ) : (
        <Component {...cardProps} />
      )}

      <div className="hint">
        {tweaks.present === "capture"
          ? "TAP CARD TO FLIP FOR THE ROUTE · ← → TO SWITCH STYLE · F TO TOGGLE FOIL"
          : "TAP CARD TO FLIP · ← → TO SWITCH STYLE · F TO TOGGLE FOIL"}
      </div>

      {/* Tweaks panel */}
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Direction">
          <window.TweakRadio label="Style" valueKey="variant" value={tweaks.variant}
            onChange={(v) => setTweak("variant", v)}
            options={[
              { value: "holo",  label: "Holo" },
              { value: "wax",   label: "Wax" },
              { value: "prism", label: "Prism" },
            ]} />
        </window.TweakSection>

        <window.TweakSection title="Card State">
          <window.TweakRadio label="State" value={tweaks.state}
            onChange={(v) => setTweak("state", v)}
            options={[
              { value: "discovered",   label: "Found" },
              { value: "undiscovered", label: "???" },
            ]} />
          <window.TweakSelect label="Rarity (IUCN)" value={tweaks.rarity}
            onChange={(v) => setTweak("rarity", v)}
            options={[
              { value: "CR", label: "CR — Critically Endangered" },
              { value: "EN", label: "EN — Endangered" },
              { value: "VU", label: "VU — Vulnerable" },
              { value: "NT", label: "NT — Near Threatened" },
              { value: "LC", label: "LC — Least Concern" },
            ]} />
          <window.TweakSlider label="Completion %" value={tweaks.completion}
            min={0} max={100} step={1}
            onChange={(v) => setTweak("completion", v)} />
        </window.TweakSection>

        <window.TweakSection title="Treatment">
          <window.TweakRadio label="Presentation" value={tweaks.present}
            onChange={(v) => setTweak("present", v)}
            options={[
              { value: "capture", label: "Capture" },
              { value: "album",   label: "Album" },
            ]} />
          <window.TweakToggle label="Foil shimmer" value={tweaks.foil}
            onChange={(v) => setTweak("foil", v)} />
          <window.TweakToggle label="Stack fan (Album only)" value={tweaks.stackFan}
            onChange={(v) => setTweak("stackFan", v)} />
          <window.TweakToggle label="Show back" value={tweaks.showBack}
            onChange={(v) => setTweak("showBack", v)} />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

// Tiny silhouette for fan-stack: just the variant's outer shape, blank.
function FannedSilhouette({ variant, rarity }) {
  const iucn = window.IUCN[rarity] || window.IUCN.LC;
  const accent = `oklch(72% ${iucn.chroma} ${iucn.hue})`;
  const baseStyle = {
    width: "100%", height: "100%",
    background: variant === "wax"
      ? "linear-gradient(180deg, #f7ecca 0%, #ecdca6 100%)"
      : "linear-gradient(180deg, #0b1220 0%, #050a14 100%)",
    border: variant === "wax" ? "1.5px solid #2c1f10" : `1.5px solid ${accent}aa`,
    borderRadius: variant === "prism" ? 0 : 16,
    boxShadow: variant === "wax"
      ? "0 12px 28px rgba(0,0,0,0.4)"
      : `0 0 24px ${accent}55, 0 12px 28px rgba(0,0,0,0.5)`,
    clipPath: variant === "prism"
      ? "polygon(24px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 12px 100%, 0 calc(100% - 12px), 0 24px)"
      : "none",
  };
  return <div style={baseStyle} />;
}

// Capture-reward frame: the end-of-run "Species Captured" moment, rebuilt so the
// collectible card IS the reward. The old flat results screen collapses into
// celebratory chrome (eyebrow + glow), the card as hero, a compact result strip,
// and the two run-end actions. Flip the card to see the recap-grade route map.
function CaptureFrame({ children, runMemory, accent, isDiscovered }) {
  const stats = [
    { num: runMemory.finalScore.toLocaleString(), lbl: "Final Score", color: "#67e8f9" },
    { num: runMemory.result, lbl: "Result", color: "#34d399" },
    { num: runMemory.observations, lbl: "Observations", color: "#fbbf24" },
    { num: runMemory.fieldNotes, lbl: "Field Notes", color: "#a78bfa" },
  ];
  return (
    <div className="capture">
      <div className="capture-eyebrow">Species Captured</div>
      <div className="capture-card">
        <div className="capture-glow" style={{ background: accent }} />
        {children}
      </div>
      {isDiscovered && (
        <div className="capture-stats">
          {stats.map((s) => (
            <div key={s.lbl} className="capture-stat">
              <span className="num" style={{ color: s.color }}>{s.num}</span>
              <span className="lbl">{s.lbl}</span>
            </div>
          ))}
        </div>
      )}
      <div className="capture-actions">
        <button className="capture-btn ghost"><span className="dot" />Thermal Read</button>
        <button className="capture-btn primary">Return to Globe</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
