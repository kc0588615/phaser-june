import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { hasFieldPlatePortrait } from '@/lib/fieldPlateCatalog';

export async function readFieldPlatePortrait(iucnId: number): Promise<Buffer | null> {
  if (!hasFieldPlatePortrait(iucnId)) return null;
  try {
    return await readFile(path.join(process.cwd(), 'server-assets', 'field-plates', `${iucnId}.png`));
  } catch (error) {
    console.error(`[field-plate] Portrait ${iucnId} unavailable:`, error);
    return null;
  }
}
