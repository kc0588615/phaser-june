// Sample species + run-memory data, mirroring the shape of SpeciesTCGCard props.
// Used by all three card variants in the prototype.

const SAMPLE_SPECIES = {
  id: 4274,
  common_name: "Jaguar",
  scientific_name: "Panthera onca",
  conservation_code: "NT",
  class: "MAMMALIA",
  family: "Felidae",
  genus: "Panthera",
  biome: "Tropical & Subtropical Moist Broadleaf Forests",
  bioregion: "Amazonia",
  realm: "Neotropic",
  marine: false,
  terrestrial: true,
  freshwater: true,
  key_fact_1: "Strongest bite of any big cat — can pierce turtle shells.",
  key_fact_2: "Strong swimmer; often hunts caiman in flooded forest.",
  key_fact_3: "Solitary except for mothers with cubs (up to 2 years).",
};

const UNKNOWN_SPECIES = {
  id: 9921,
  common_name: null,
  scientific_name: null,
  conservation_code: "VU",
  class: "AVES",
  family: null,
  biome: "Mangrove",
  marine: false,
  terrestrial: true,
  freshwater: true,
  key_fact_1: null,
  key_fact_2: null,
  key_fact_3: null,
};

// Realistic-looking expedition path through the Amazon basin,
// chosen to draw a recognizable curve in the mini-map.
const ROUTE_POLYLINE = [
  { lon: -73.2, lat: -3.7 },   // Iquitos
  { lon: -70.0, lat: -4.2 },   // upriver
  { lon: -66.5, lat: -3.1 },   // Rio Negro confluence
  { lon: -62.0, lat: -3.1 },   // Manaus
  { lon: -58.4, lat: -2.6 },   // mid-Amazon
  { lon: -55.0, lat: -2.4 },   // Santarém
  { lon: -51.1, lat: -1.5 },   // Belém / Pará
];

// Typed, slotted waypoints — the recap-grade shape (mirrors ExpeditionWaypoint).
// slot 0 is the basecamp; visitedWaypointSlot marks how far the run reached.
const WAYPOINTS = [
  { slot: 0, lon: -73.2, lat: -3.7, name: "Iquitos Basecamp", waypointType: "basecamp" },
  { slot: 1, lon: -70.0, lat: -4.2, name: "Rio Marañón",      waypointType: "river" },
  { slot: 2, lon: -66.5, lat: -3.1, name: "Rio Negro",        waypointType: "river" },
  { slot: 3, lon: -62.0, lat: -3.1, name: "Manaus",           waypointType: "city" },
  { slot: 4, lon: -58.4, lat: -2.6, name: "Mamirauá Reserve", waypointType: "protected_area" },
  { slot: 5, lon: -55.0, lat: -2.4, name: "Marajó Várzea",    waypointType: "wetland" },
  { slot: 6, lon: -51.1, lat: -1.5, name: "Belém Delta",      waypointType: "protected_area" },
];

const RUN_MEMORY = {
  bioregion: "Amazonia",
  realm: "Neotropic",
  biome: "Tropical & Subtropical Moist Broadleaf Forests",
  finalScore: 4280,
  startedAt: "2026-04-22T10:14:00Z",
  routePolyline: ROUTE_POLYLINE,
  waypoints: WAYPOINTS,
  visitedWaypointSlot: 6,
  captured: true,
  // Result-screen stats (folded into the capture reward frame).
  result: "Captured",
  observations: 5,
  fieldNotes: 3,
  nodes: [
    { nodeType: "city",      counterGem: "ruby",     obstacleFamily: "fog",     scoreEarned: 540,  waypoint: { name: "Iquitos",       waypointType: "city" } },
    { nodeType: "river",     counterGem: "sapphire", obstacleFamily: "current", scoreEarned: 720,  waypoint: { name: "Rio Marañón",   waypointType: "river" } },
    { nodeType: "river",     counterGem: "sapphire", obstacleFamily: "current", scoreEarned: 610,  waypoint: { name: "Rio Negro",     waypointType: "river" } },
    { nodeType: "city",      counterGem: "ruby",     obstacleFamily: "noise",   scoreEarned: 480,  waypoint: { name: "Manaus",        waypointType: "city" } },
    { nodeType: "protected", counterGem: "emerald",  obstacleFamily: "canopy",  scoreEarned: 980,  waypoint: { name: "Mamirauá",      waypointType: "protected_area" } },
    { nodeType: "wetland",   counterGem: "topaz",    obstacleFamily: "tide",    scoreEarned: 950,  waypoint: { name: "Marajó Várzea", waypointType: "wetland" } },
  ],
};

const GIS_STAMPS = ["river", "lake", "protected_area", "bioregion", "ramsar_site"];

const FACTS_UNLOCKED_FULL = ["key_fact_1", "key_fact_2", "key_fact_3"];

const CLUE_CATEGORIES_FULL = [
  "classification", "habitat", "geographic", "morphology",
  "behavior", "life_cycle", "conservation", "key_facts",
];

// Conservation status palette — drives border, glow, and badge.
const IUCN = {
  CR: { code: "CR", label: "Critically Endangered", hue: 8,   chroma: 0.18, swatch: "#ef4444" },
  EN: { code: "EN", label: "Endangered",            hue: 50,  chroma: 0.16, swatch: "#f59e0b" },
  VU: { code: "VU", label: "Vulnerable",            hue: 200, chroma: 0.15, swatch: "#22d3ee" },
  NT: { code: "NT", label: "Near Threatened",       hue: 145, chroma: 0.14, swatch: "#34d399" },
  LC: { code: "LC", label: "Least Concern",         hue: 240, chroma: 0.04, swatch: "#94a3b8" },
};

const CLASS_EMOJI = {
  AVES: "🐦", MAMMALIA: "🦁", REPTILIA: "🦎", AMPHIBIA: "🐸",
  ACTINOPTERYGII: "🐟", CHONDRICHTHYES: "🦈", INSECTA: "🦋",
};

const CLASS_LABEL = {
  AVES: "Bird", MAMMALIA: "Mammal", REPTILIA: "Reptile", AMPHIBIA: "Amphibian",
  ACTINOPTERYGII: "Fish", CHONDRICHTHYES: "Shark", INSECTA: "Insect",
};

const CLUE_CATEGORIES = {
  classification: { icon: "🧬", label: "Class" },
  habitat:        { icon: "🌳", label: "Habitat" },
  geographic:     { icon: "🗺",  label: "Range" },
  morphology:     { icon: "🐾", label: "Form" },
  behavior:       { icon: "💨", label: "Behavior" },
  life_cycle:     { icon: "⏳", label: "Life" },
  conservation:   { icon: "🛡",  label: "Status" },
  key_facts:      { icon: "🔮", label: "Facts" },
};

const GIS_BADGES = {
  river:          { icon: "🌊", label: "River" },
  lake:           { icon: "💧", label: "Lake" },
  protected_area: { icon: "🛡",  label: "Protected" },
  bioregion:      { icon: "🌍", label: "Bioregion" },
  ramsar_site:    { icon: "🏞", label: "Ramsar" },
};

const WAYPOINT_TYPE_COLOR = {
  city:           "#fbbf24",
  river:          "#22d3ee",
  protected_area: "#34d399",
  protected:      "#34d399",
  wetland:        "#a78bfa",
  lake:           "#60a5fa",
};

Object.assign(window, {
  SAMPLE_SPECIES, UNKNOWN_SPECIES, RUN_MEMORY, GIS_STAMPS,
  FACTS_UNLOCKED_FULL, CLUE_CATEGORIES_FULL,
  IUCN, CLASS_EMOJI, CLASS_LABEL, CLUE_CATEGORIES, GIS_BADGES, WAYPOINT_TYPE_COLOR,
});
