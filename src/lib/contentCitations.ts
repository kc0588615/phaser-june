// The source registry and page citations from db/content/, as JSON imports so the bundler ships them
// (the run image has no db/ folder). Server and scripts only: the client gets citations in the pool.
import sourcesJson from '../../db/content/sources.json';
import citationsJson from '../../db/content/citations.json';
import type { CitedPage } from '@/clueGame/citations';
import type { ContentSource } from '@/clueGame/profiles';

/** db/content/sources.json (JSON infers `tier: number`; the content check keeps it 1-4). */
export const contentSources = sourcesJson as ContentSource[];
/** db/content/citations.json: page URL -> its citation entry. */
export const citedPages: Readonly<Record<string, CitedPage>> = citationsJson;
