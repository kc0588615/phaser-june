// The real Clue Match content, built from db/content/ the way `npm run content -- build` does.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { contentRowsFromProfiles, type AnimalProfile, type ContentSource } from '@/clueGame/profiles';
import { poolFromRows } from '@/clueGame/pool';

const dir = path.join(process.cwd(), 'db/content');
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
export const profiles: AnimalProfile[] = readdirSync(path.join(dir, 'animals')).filter(file => file.endsWith('.json')).sort()
  .map(file => read(path.join(dir, 'animals', file)));
export const sources: ContentSource[] = read(path.join(dir, 'sources.json'));
export const contentPool = poolFromRows(contentRowsFromProfiles(profiles));
