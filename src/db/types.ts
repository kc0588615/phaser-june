import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  habitatColormap,
  highScores,
  icaa,
  icaaView,
  oneearthBioregion,
  playerClueUnlocks,
  playerGameSessions,
  playerSpeciesDiscoveries,
  playerStats,
  profiles,
} from './schema';

// Select types (for reading)
export type Profile = InferSelectModel<typeof profiles>;
export type PlayerGameSession = InferSelectModel<typeof playerGameSessions>;
export type PlayerSpeciesDiscovery = InferSelectModel<typeof playerSpeciesDiscoveries>;
export type PlayerClueUnlock = InferSelectModel<typeof playerClueUnlocks>;
export type PlayerStats = InferSelectModel<typeof playerStats>;
export type HighScore = InferSelectModel<typeof highScores>;
export type HabitatColormap = InferSelectModel<typeof habitatColormap>;

// Spatial tables (introspected)
export type ICAA = InferSelectModel<typeof icaa>;
export type ICAAView = typeof icaaView.$inferSelect;
export type OneEarthBioregion = InferSelectModel<typeof oneearthBioregion>;

// Insert types (for writing)
export type NewHighScore = InferInsertModel<typeof highScores>;
export type NewPlayerGameSession = InferInsertModel<typeof playerGameSessions>;
export type NewPlayerSpeciesDiscovery = InferInsertModel<typeof playerSpeciesDiscoveries>;
export type NewPlayerClueUnlock = InferInsertModel<typeof playerClueUnlocks>;
