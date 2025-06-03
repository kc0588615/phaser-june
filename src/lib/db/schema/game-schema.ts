import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (simplified from the SaaS starter)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('player'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Species table
export const species = pgTable('species', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  scientificName: varchar('scientific_name', { length: 255 }),
  habitatTypes: jsonb('habitat_types').$type<string[]>().default([]),
  rarity: varchar('rarity', { length: 50 }),
  points: integer('points').default(0),
  description: text('description'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Habitats table
export const habitats = pgTable('habitats', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  iucnCode: varchar('iucn_code', { length: 50 }).unique(),
  description: text('description'),
  ecosystemType: varchar('ecosystem_type', { length: 100 }),
  colorHex: varchar('color_hex', { length: 7 }), // For map display
  geometry: jsonb('geometry'), // GeoJSON geometry
  tileUrl: text('tile_url'), // TiTiler endpoint
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Player progress table
export const playerProgress = pgTable('player_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  speciesDiscovered: jsonb('species_discovered').$type<number[]>().default([]),
  habitatsDiscovered: jsonb('habitats_discovered').$type<number[]>().default([]),
  highScore: integer('high_score').default(0),
  totalScore: integer('total_score').default(0),
  gamesPlayed: integer('games_played').default(0),
  achievements: jsonb('achievements').$type<Array<{
    id: string;
    unlockedAt: string;
  }>>().default([]),
  lastPlayed: timestamp('last_played'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex('player_progress_user_id_idx').on(table.userId),
}));

// Game sessions table
export const gameSessions = pgTable('game_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  speciesFound: jsonb('species_found').$type<number[]>().default([]),
  habitatsVisited: jsonb('habitats_visited').$type<number[]>().default([]),
  duration: integer('duration'), // in seconds
  gameMode: varchar('game_mode', { length: 50 }).default('classic'),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  playerProgress: one(playerProgress, {
    fields: [users.id],
    references: [playerProgress.userId],
  }),
  gameSessions: many(gameSessions),
}));

export const playerProgressRelations = relations(playerProgress, ({ one }) => ({
  user: one(users, {
    fields: [playerProgress.userId],
    references: [users.id],
  }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  user: one(users, {
    fields: [gameSessions.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Species = typeof species.$inferSelect;
export type NewSpecies = typeof species.$inferInsert;
export type Habitat = typeof habitats.$inferSelect;
export type NewHabitat = typeof habitats.$inferInsert;
export type PlayerProgress = typeof playerProgress.$inferSelect;
export type NewPlayerProgress = typeof playerProgress.$inferInsert;
export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;