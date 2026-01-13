-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SEQUENCE "public"."icaa_ogc_fid_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."oneearth_bioregion_ogc_fid_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "player_species_discoveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid,
	"species_id" integer,
	"session_id" uuid,
	"discovered_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"time_to_discover_seconds" integer,
	"clues_unlocked_before_guess" integer DEFAULT 0,
	"incorrect_guesses_count" integer DEFAULT 0,
	"score_earned" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "player_clue_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid,
	"species_id" integer,
	"discovery_id" uuid,
	"clue_category" text NOT NULL,
	"clue_field" text NOT NULL,
	"clue_value" text,
	"unlocked_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"player_id" uuid PRIMARY KEY NOT NULL,
	"total_species_discovered" integer DEFAULT 0,
	"total_clues_unlocked" integer DEFAULT 0,
	"total_score" integer DEFAULT 0,
	"total_moves_made" integer DEFAULT 0,
	"total_games_played" integer DEFAULT 0,
	"total_play_time_seconds" integer DEFAULT 0,
	"average_clues_per_discovery" numeric(65, 30),
	"fastest_discovery_clues" integer,
	"slowest_discovery_clues" integer,
	"average_time_per_discovery_seconds" integer,
	"species_by_order" jsonb DEFAULT '{}'::jsonb,
	"species_by_family" jsonb DEFAULT '{}'::jsonb,
	"species_by_genus" jsonb DEFAULT '{}'::jsonb,
	"species_by_realm" jsonb DEFAULT '{}'::jsonb,
	"species_by_biome" jsonb DEFAULT '{}'::jsonb,
	"species_by_bioregion" jsonb DEFAULT '{}'::jsonb,
	"marine_species_count" integer DEFAULT 0,
	"terrestrial_species_count" integer DEFAULT 0,
	"freshwater_species_count" integer DEFAULT 0,
	"aquatic_species_count" integer DEFAULT 0,
	"species_by_iucn_status" jsonb DEFAULT '{}'::jsonb,
	"clues_by_category" jsonb DEFAULT '{}'::jsonb,
	"favorite_clue_category" text,
	"first_discovery_at" timestamp with time zone,
	"last_discovery_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "habitat_colormap" (
	"value" integer PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid,
	"started_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"ended_at" timestamp with time zone,
	"total_moves" integer DEFAULT 0,
	"total_score" integer DEFAULT 0,
	"species_discovered_in_session" integer DEFAULT 0,
	"clues_unlocked_in_session" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"username" text,
	"full_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "high_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "player_species_discoveries" ADD CONSTRAINT "fk_player_species_discoveries_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_species_discoveries" ADD CONSTRAINT "fk_player_species_discoveries_species_id" FOREIGN KEY ("species_id") REFERENCES "public"."icaa"("ogc_fid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_species_discoveries" ADD CONSTRAINT "fk_player_species_discoveries_session_id" FOREIGN KEY ("session_id") REFERENCES "public"."player_game_sessions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_clue_unlocks" ADD CONSTRAINT "fk_player_clue_unlocks_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_clue_unlocks" ADD CONSTRAINT "fk_player_clue_unlocks_species_id" FOREIGN KEY ("species_id") REFERENCES "public"."icaa"("ogc_fid") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_clue_unlocks" ADD CONSTRAINT "fk_player_clue_unlocks_discovery_id" FOREIGN KEY ("discovery_id") REFERENCES "public"."player_species_discoveries"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "fk_player_stats_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "player_game_sessions" ADD CONSTRAINT "fk_player_game_sessions_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ix_player_species_discoveries_session_id" ON "player_species_discoveries" USING btree ("session_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_player_species_discoveries_player_species" ON "player_species_discoveries" USING btree ("player_id" int4_ops,"species_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_clue_unlocks_discovery_id" ON "player_clue_unlocks" USING btree ("discovery_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_player_clue_unlocks_player_species_category_field" ON "player_clue_unlocks" USING btree ("player_id" text_ops,"species_id" text_ops,"clue_category" text_ops,"clue_field" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_game_sessions_player_id" ON "player_game_sessions" USING btree ("player_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_profiles_username" ON "profiles" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "ix_high_scores_score" ON "high_scores" USING btree ("score" int4_ops);
*/