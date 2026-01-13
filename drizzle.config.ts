import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// Load env files
config(); // .env
config({ path: '.env.local' }); // .env.local overrides

// Strip pgbouncer param (not supported by postgres.js startup)
function stripPgBouncer(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete('pgbouncer');
  return parsed.toString();
}

const dbUrl = stripPgBouncer(process.env.DATABASE_URL!);

export default {
  schema: './src/db/schema/**/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  tablesFilter: ['high_scores', 'player_*', 'profiles', 'habitat_colormap'],
} satisfies Config;
