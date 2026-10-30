// Animal profiles from db/content/animals/*.json, read by the content tool (scripts/content.ts) and the
// website build (src/site/render.tsx). Node only; no Next imports.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AnimalProfile } from '@/clueGame/profiles';

export const CONTENT_DIR = path.join(process.cwd(), 'db/content');
export const ANIMALS_DIR = path.join(CONTENT_DIR, 'animals');

export async function readProfiles(): Promise<Array<{ file: string; profile: AnimalProfile }>> {
  const files = (await readdir(ANIMALS_DIR)).filter(file => file.endsWith('.json')).sort();
  return Promise.all(files.map(async file => ({ file, profile: JSON.parse(await readFile(path.join(ANIMALS_DIR, file), 'utf8')) as AnimalProfile })));
}
