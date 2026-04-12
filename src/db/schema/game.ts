import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { profiles, playerGameSessions } from './player';
import { icaa } from './species';

export const highScores = pgTable(
  'high_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Optional FK to profiles - allows linking to authenticated players while
    // preserving legacy anonymous scores (player_id NULL)
    playerId: uuid('player_id').references(() => profiles.userId),
    username: text('username').notNull(),
    score: integer('score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixHighScoresScore: index('ix_high_scores_score').on(table.score.desc()),
    ixHighScoresPlayerId: index('ix_high_scores_player_id').on(table.playerId),
  })
);

export const habitatColormap = pgTable('habitat_colormap', {
  value: integer('value').primaryKey(),
  label: text('label').notNull(),
});

export const protectedPlanetParcels = pgTable(
  'protected_planet_parcels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: integer('site_id').notNull(),
    sitePid: text('site_pid').notNull(),
    siteType: text('site_type').notNull(),
    parcelOrdinal: smallint('parcel_ordinal').notNull().default(1),
    nameEnglish: text('name_english'),
    name: text('name'),
    realmId: integer('realm_id'),
    realmName: text('realm_name'),
    iucnCategoryName: text('iucn_category_name'),
    designationName: text('designation_name'),
    designationEng: text('designation_eng'),
    governanceType: text('governance_type'),
    governanceSubtype: text('governance_subtype'),
    ownershipType: text('ownership_type'),
    ownershipSubtype: text('ownership_subtype'),
    inlandWaters: text('inland_waters'),
    oecmAssessment: text('oecm_assessment'),
    countryIso3: text('country_iso3'),
    iso3: text('iso3'),
    marine: boolean('marine'),
    noTake: text('no_take'),
    noTakeArea: numeric('no_take_area'),
    repArea: numeric('rep_area'),
    gisArea: numeric('gis_area'),
    sourceUpdatedYear: integer('source_updated_year'),
    sourcePayload: jsonb('source_payload').notNull().default(sql`'{}'::jsonb`),
    sourceMeta: jsonb('source_meta').notNull().default(sql`'{}'::jsonb`),
    geom: geometry('geom', { type: 'multipolygon', srid: 4326 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqProtectedPlanetParcelsPidOrdinal: uniqueIndex('uq_protected_planet_parcels_pid_ordinal').on(
      table.sitePid,
      table.parcelOrdinal
    ),
    ixProtectedPlanetParcelsSiteId: index('ix_protected_planet_parcels_site_id').on(table.siteId),
    ixProtectedPlanetParcelsSitePid: index('ix_protected_planet_parcels_site_pid').on(table.sitePid),
    ixProtectedPlanetParcelsSiteType: index('ix_protected_planet_parcels_site_type').on(table.siteType),
    ixProtectedPlanetParcelsCountryIso3: index('ix_protected_planet_parcels_country_iso3').on(table.countryIso3),
    ixProtectedPlanetParcelsRealm: index('ix_protected_planet_parcels_realm').on(table.realmName),
    ixProtectedPlanetParcelsGeom: index('ix_protected_planet_parcels_geom')
      .using('gist', table.geom),
  })
);

// ---------------------------------------------------------------------------
// Eco run loop tables (migration 007)
// ---------------------------------------------------------------------------

export const ecoRunSessions = pgTable(
  'eco_run_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').references(() => profiles.userId, { onDelete: 'set null' }),
    gameSessionId: uuid('game_session_id').references(() => playerGameSessions.id, { onDelete: 'set null' }),
    runStatus: text('run_status').notNull().default('active'),
    runSeed: bigint('run_seed', { mode: 'number' }),
    nodeCountPlanned: smallint('node_count_planned').notNull().default(6),
    nodeIndexCurrent: smallint('node_index_current').notNull().default(1),
    selectedLng: doublePrecision('selected_lng').notNull(),
    selectedLat: doublePrecision('selected_lat').notNull(),
    selectedPoint: geometry('selected_point', { type: 'point', srid: 4326 }),
    selectionZoom: numeric('selection_zoom', { precision: 6, scale: 2 }),
    locationKey: text('location_key').notNull(),
    realm: text('realm'),
    biome: text('biome'),
    bioregion: text('bioregion'),
    moveBudget: integer('move_budget').notNull().default(0),
    movesUsed: integer('moves_used').notNull().default(0),
    scoreTotal: integer('score_total').notNull().default(0),
    speciesDiscoveredCount: integer('species_discovered_count').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    ixEcoRunSessionsPlayerStarted: index('ix_eco_run_sessions_player_started').on(table.playerId, table.startedAt),
    ixEcoRunSessionsStatusStarted: index('ix_eco_run_sessions_status_started').on(table.runStatus, table.startedAt),
    ixEcoRunSessionsLocationKey: index('ix_eco_run_sessions_location_key').on(table.locationKey),
    ixEcoRunSessionsSelectedPoint: index('ix_eco_run_sessions_selected_point').using('gist', table.selectedPoint),
  })
);

export const ecoRunNodes = pgTable(
  'eco_run_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id').notNull().references(() => ecoRunSessions.id, { onDelete: 'cascade' }),
    nodeOrder: smallint('node_order').notNull(),
    nodeType: text('node_type').notNull(),
    nodeStatus: text('node_status').notNull().default('locked'),
    objectiveType: text('objective_type').notNull().default('match_count'),
    objectiveTarget: integer('objective_target').notNull().default(0),
    objectiveProgress: integer('objective_progress').notNull().default(0),
    moveBudget: integer('move_budget').notNull().default(0),
    movesUsed: integer('moves_used').notNull().default(0),
    boardSeed: bigint('board_seed', { mode: 'number' }),
    boardSamplingMethod: text('board_sampling_method').notNull().default('center_point'),
    boardContext: jsonb('board_context').notNull().default(sql`'{}'::jsonb`),
    hazardProfile: jsonb('hazard_profile').notNull().default(sql`'{}'::jsonb`),
    toolProfile: jsonb('tool_profile').notNull().default(sql`'{}'::jsonb`),
    rewardProfile: jsonb('reward_profile').notNull().default(sql`'{}'::jsonb`),
    rewardClaimed: boolean('reward_claimed').notNull().default(false),
    wagerTier: text('wager_tier'),
    wagerResult: text('wager_result'),
    guessedSpeciesId: integer('guessed_species_id').references(() => icaa.ogcFid, { onDelete: 'set null' }),
    guessCorrect: boolean('guess_correct'),
    scoreEarned: integer('score_earned').notNull().default(0),
    dominantHabitat: text('dominant_habitat'),
    centerPoint: geometry('center_point', { type: 'point', srid: 4326 }),
    bbox: geometry('bbox', { type: 'polygon', srid: 4326 }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqEcoRunNodesRunOrder: uniqueIndex('uq_eco_run_nodes_run_order').on(table.runId, table.nodeOrder),
    ixEcoRunNodesRunStatus: index('ix_eco_run_nodes_run_status').on(table.runId, table.nodeStatus),
    ixEcoRunNodesType: index('ix_eco_run_nodes_type').on(table.nodeType),
    ixEcoRunNodesCenterPoint: index('ix_eco_run_nodes_center_point').using('gist', table.centerPoint),
    ixEcoRunNodesBbox: index('ix_eco_run_nodes_bbox').using('gist', table.bbox),
  })
);

export const ecoNodeAttempts = pgTable(
  'eco_node_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nodeId: uuid('node_id').notNull().references(() => ecoRunNodes.id, { onDelete: 'cascade' }),
    attemptNo: smallint('attempt_no').notNull().default(1),
    result: text('result').notNull().default('in_progress'),
    movesUsed: integer('moves_used').notNull().default(0),
    cluesUnlocked: integer('clues_unlocked').notNull().default(0),
    scoreDelta: integer('score_delta').notNull().default(0),
    telemetry: jsonb('telemetry').notNull().default(sql`'{}'::jsonb`),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => ({
    uqEcoNodeAttemptsNodeAttempt: uniqueIndex('uq_eco_node_attempts_node_attempt').on(table.nodeId, table.attemptNo),
    ixEcoNodeAttemptsNode: index('ix_eco_node_attempts_node').on(table.nodeId, table.attemptNo),
  })
);

export const ecoLocationMastery = pgTable(
  'eco_location_mastery',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').notNull().references(() => profiles.userId, { onDelete: 'cascade' }),
    locationKey: text('location_key').notNull(),
    centerPoint: geometry('center_point', { type: 'point', srid: 4326 }),
    realm: text('realm'),
    biome: text('biome'),
    bioregion: text('bioregion'),
    runsStarted: integer('runs_started').notNull().default(0),
    runsCompleted: integer('runs_completed').notNull().default(0),
    bestRunScore: integer('best_run_score').notNull().default(0),
    bestSpeciesChain: integer('best_species_chain').notNull().default(0),
    totalSpeciesDiscovered: integer('total_species_discovered').notNull().default(0),
    masteryTier: smallint('mastery_tier').notNull().default(0),
    firstPlayedAt: timestamp('first_played_at', { withTimezone: true }).notNull().defaultNow(),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    uqEcoLocationMasteryPlayerLocation: uniqueIndex('uq_eco_location_mastery_player_location').on(table.playerId, table.locationKey),
    ixEcoLocationMasteryPlayer: index('ix_eco_location_mastery_player').on(table.playerId),
    ixEcoLocationMasteryLocationKey: index('ix_eco_location_mastery_location_key').on(table.locationKey),
    ixEcoLocationMasteryCenterPoint: index('ix_eco_location_mastery_center_point').using('gist', table.centerPoint),
  })
);

export const ecoGisLayers = pgTable('eco_gis_layers', {
  id: serial('id').primaryKey(),
  layerKey: text('layer_key').notNull().unique(),
  displayName: text('display_name').notNull(),
  sourceOrg: text('source_org').notNull(),
  sourceUrl: text('source_url'),
  license: text('license'),
  geometryType: text('geometry_type').notNull().default('raster'),
  spatialResolutionM: numeric('spatial_resolution_m', { precision: 10, scale: 2 }),
  temporalResolution: text('temporal_resolution'),
  coverage: text('coverage').notNull().default('global'),
  enabled: boolean('enabled').notNull().default(true),
  decayM: integer('decay_m').notNull().default(500),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ecoNodeGisSamples = pgTable(
  'eco_node_gis_samples',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nodeId: uuid('node_id').notNull().references(() => ecoRunNodes.id, { onDelete: 'cascade' }),
    layerId: integer('layer_id').notNull().references(() => ecoGisLayers.id, { onDelete: 'restrict' }),
    signalKey: text('signal_key').notNull(),
    signalValueNumeric: numeric('signal_value_numeric'),
    signalValueText: text('signal_value_text'),
    signalPayload: jsonb('signal_payload').notNull().default(sql`'{}'::jsonb`),
    sampleMethod: text('sample_method').notNull().default('center_point'),
    sampleGeometry: geometry('sample_geometry', { type: 'polygon', srid: 4326 }),
    sampledAt: timestamp('sampled_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqEcoNodeGisSamplesKey: uniqueIndex('uq_eco_node_gis_samples_key').on(table.nodeId, table.layerId, table.signalKey),
    ixEcoNodeGisSamplesNode: index('ix_eco_node_gis_samples_node').on(table.nodeId),
    ixEcoNodeGisSamplesLayer: index('ix_eco_node_gis_samples_layer').on(table.layerId),
    ixEcoNodeGisSamplesGeometry: index('ix_eco_node_gis_samples_geometry').using('gist', table.sampleGeometry),
  })
);

// ---------------------------------------------------------------------------
// Water layers (migration 009)
// ---------------------------------------------------------------------------

export const hydroRivers = pgTable(
  'hydro_rivers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hyrivId: integer('hyriv_id').notNull().unique(),
    ordStra: smallint('ord_stra'),
    ordFlow: smallint('ord_flow'),
    uplandSkm: numeric('upland_skm'),
    lengthKm: numeric('length_km'),
    disM3Pyr: numeric('dis_m3_pyr'),
    geom: geometry('geom', { type: 'multilinestring', srid: 4326 }).notNull(),
  },
  (table) => ({
    ixHydroRiversGeom: index('ix_hydro_rivers_geom').using('gist', table.geom),
    ixHydroRiversOrdStra: index('ix_hydro_rivers_ord_stra').on(table.ordStra),
  })
);

export const hydroLakes = pgTable(
  'hydro_lakes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hylakId: integer('hylak_id').notNull().unique(),
    lakeName: text('lake_name'),
    lakeType: smallint('lake_type'),
    lakeArea: numeric('lake_area'),
    volTotal: numeric('vol_total'),
    shoreLen: numeric('shore_len'),
    depthAvg: numeric('depth_avg'),
    elevation: numeric('elevation'),
    geom: geometry('geom', { type: 'multipolygon', srid: 4326 }).notNull(),
  },
  (table) => ({
    ixHydroLakesGeom: index('ix_hydro_lakes_geom').using('gist', table.geom),
    ixHydroLakesLakeType: index('ix_hydro_lakes_lake_type').on(table.lakeType),
  })
);

// ---------------------------------------------------------------------------
// Marine regions (migration 010)
// ---------------------------------------------------------------------------

export const marineEez = pgTable(
  'marine_eez',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mrgid: integer('mrgid').notNull().unique(),
    geoname: text('geoname'),
    sovereign1: text('sovereign1'),
    territory1: text('territory1'),
    areaKm2: numeric('area_km2'),
    geom: geometry('geom', { type: 'multipolygon', srid: 4326 }).notNull(),
  },
  (table) => ({
    ixMarineEezGeom: index('ix_marine_eez_geom').using('gist', table.geom),
    ixMarineEezSovereign: index('ix_marine_eez_sovereign').on(table.sovereign1),
  })
);

// ---------------------------------------------------------------------------
// Species Album TCG tables
// ---------------------------------------------------------------------------

export const speciesCards = pgTable(
  'species_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').notNull().references(() => profiles.userId, { onDelete: 'cascade' }),
    speciesId: integer('species_id').notNull().references(() => icaa.ogcFid, { onDelete: 'cascade' }),
    discovered: boolean('discovered').notNull().default(false),
    firstDiscoveredAt: timestamp('first_discovered_at', { withTimezone: true }),
    lastEncounteredAt: timestamp('last_encountered_at', { withTimezone: true }),
    timesEncountered: integer('times_encountered').notNull().default(0),
    bestRunId: uuid('best_run_id').references(() => ecoRunSessions.id, { onDelete: 'set null' }),
    bestRunScore: integer('best_run_score'),
    completionPct: integer('completion_pct').notNull().default(0),
    rarityTier: text('rarity_tier').notNull().default('common'),
    conservationCode: text('conservation_code'),
    affinityTags: jsonb('affinity_tags').notNull().default(sql`'[]'::jsonb`),
    factsUnlocked: jsonb('facts_unlocked').notNull().default(sql`'[]'::jsonb`),
    clueCategoriesUnlocked: jsonb('clue_categories_unlocked').notNull().default(sql`'[]'::jsonb`),
    gisStamps: jsonb('gis_stamps').notNull().default(sql`'[]'::jsonb`),
    expeditionRegionsSeen: jsonb('expedition_regions_seen').notNull().default(sql`'[]'::jsonb`),
    cardVariant: text('card_variant'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqSpeciesCardsPlayerSpecies: uniqueIndex('uq_species_cards_player_species').on(table.playerId, table.speciesId),
    ixSpeciesCardsPlayer: index('ix_species_cards_player').on(table.playerId),
    ixSpeciesCardsDiscovered: index('ix_species_cards_discovered').on(table.playerId, table.discovered),
  })
);

export const runMemories = pgTable(
  'run_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id').notNull().references(() => ecoRunSessions.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id').references(() => profiles.userId, { onDelete: 'set null' }),
    speciesId: integer('species_id').references(() => icaa.ogcFid, { onDelete: 'set null' }),
    locationKey: text('location_key').notNull(),
    startLon: doublePrecision('start_lon').notNull(),
    startLat: doublePrecision('start_lat').notNull(),
    routePolyline: jsonb('route_polyline').notNull().default(sql`'[]'::jsonb`),
    routeBounds: jsonb('route_bounds'),
    nodes: jsonb('nodes').notNull().default(sql`'[]'::jsonb`),
    gisFeaturesNearby: jsonb('gis_features_nearby').notNull().default(sql`'[]'::jsonb`),
    eventsTriggered: jsonb('events_triggered').notNull().default(sql`'[]'::jsonb`),
    itemsUsed: jsonb('items_used').notNull().default(sql`'[]'::jsonb`),
    deductionSummary: jsonb('deduction_summary'),
    finalScore: integer('final_score'),
    realm: text('realm'),
    biome: text('biome'),
    bioregion: text('bioregion'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqRunMemoriesRun: uniqueIndex('uq_run_memories_run').on(table.runId),
    ixRunMemoriesPlayer: index('ix_run_memories_player').on(table.playerId),
    ixRunMemoriesSpecies: index('ix_run_memories_species').on(table.speciesId),
  })
);

export const speciesCardUnlocks = pgTable(
  'species_card_unlocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').notNull().references(() => profiles.userId, { onDelete: 'cascade' }),
    speciesId: integer('species_id').notNull().references(() => icaa.ogcFid, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => ecoRunSessions.id, { onDelete: 'set null' }),
    unlockType: text('unlock_type').notNull(),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ixSpeciesCardUnlocksPlayer: index('ix_species_card_unlocks_player').on(table.playerId),
    ixSpeciesCardUnlocksSpecies: index('ix_species_card_unlocks_species').on(table.speciesId),
    ixSpeciesCardUnlocksRun: index('ix_species_card_unlocks_run').on(table.runId),
  })
);
