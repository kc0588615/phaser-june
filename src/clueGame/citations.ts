// Citations for the pages behind clues and facts (pure, client-safe).
// A source's `citeAs` template (db/content/sources.json) plus a page's entry
// (db/content/citations.json) render one citation. Guide: docs/CONTENT_SOURCES.md.

/** A page's entry in db/content/citations.json. */
export interface CitedPage {
  /** YYYY-MM-DD: the day the page (or its archived copy) was read. */
  accessed: string;
  /** The page's own citation line, verbatim, without its "Accessed …". */
  cite?: string;
  /** Wayback viewer URL: https://web.archive.org/web/<14-digit timestamp>/<url>. */
  archive?: string;
  /** The page's own licence; beats the source's default. */
  license?: string;
}

/** What a citation needs from a source registry row. */
export interface CitationSource { key: string; name: string; citeAs?: string; license?: string }

export interface Citation {
  text: string;
  url: string;
  license: string | null;
  archive: { url: string; date: string } | null;
}

/** Sources whose licence requires attribution: their citation must be complete (no fallback). */
export const FULL_CITATION_KEYS: readonly string[] = ['amphibiaweb', 'wikipedia'];

const FALLBACK = '{name}. Accessed {accessed}.';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ARCHIVE = /^https:\/\/web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\/\S+$/;

function daysIn(year: number, month: number): number {
  return month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function day(year: number, month: number, date: number): string | null {
  return month >= 1 && month <= 12 && date >= 1 && date <= daysIn(year, month) ? `${date} ${MONTHS[month - 1]} ${year}` : null;
}

/** `2026-11-08` -> `8 Nov 2026`. No Date or locale, so no timezone shift. Throws on a bad date. */
export function formatDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const text = match && day(Number(match[1]), Number(match[2]), Number(match[3]));
  if (!text) throw new Error(`bad date ${JSON.stringify(iso)} (want YYYY-MM-DD)`);
  return text;
}

function archiveOf(archive: string): { url: string; date: string } {
  const [, y, mo, d, h, mi, s] = (ARCHIVE.exec(archive) ?? []).map(Number);
  const date = y === undefined ? null : day(y, mo, d);
  if (!date || h > 23 || mi > 59 || s > 59) throw new Error(`bad archive ${JSON.stringify(archive)} (want https://web.archive.org/web/<14-digit timestamp>/<url>)`);
  return { url: archive, date };
}

/** Wikipedia's article title: the URL's last path segment, decoded, `_` as spaces. */
function titleOf(url: string): string | undefined {
  const segment = new URL(url).pathname.split('/').pop();
  return segment ? decodeURIComponent(segment).replaceAll('_', ' ') : undefined;
}

/**
 * The citation for one page. No entry, or a full-citation source missing a
 * field: `citation: null`. Any other source missing a field falls back to
 * `{name}. Accessed {accessed}.`. `missing` names the fields that were absent.
 * Throws on data bugs: an unknown placeholder, a bad date or archive, or a
 * `cite` that carries its own access date (it would print twice).
 */
export function renderCitation(source: CitationSource, url: string, page: CitedPage | undefined): { citation: Citation | null; missing: string[] } {
  if (!page) return { citation: null, missing: ['accessed'] };
  const where = `${source.key} page ${url}`;
  if (page.cite && /\bAccessed\b/.test(page.cite)) throw new Error(`${where}: cite carries its own "Accessed …"; drop it`);
  let accessed: string;
  try { accessed = formatDay(page.accessed); } catch (error) { throw new Error(`${where}: accessed: ${(error as Error).message}`); }
  const archive = page.archive ? archiveOf(page.archive) : null;
  const values: Record<string, string | undefined> = { name: source.name, cite: page.cite, title: source.key === 'wikipedia' ? titleOf(url) : undefined, accessed };
  const template = source.citeAs ?? FALLBACK;
  const missing: string[] = [];
  for (const [, name] of template.matchAll(/\{(\w+)\}/g)) {
    if (!(name in values)) throw new Error(`${where}: unknown placeholder {${name}} in citeAs`);
    if (!values[name] && !missing.includes(name)) missing.push(name);
  }
  if (missing.length && FULL_CITATION_KEYS.includes(source.key)) return { citation: null, missing };
  const text = (missing.length ? FALLBACK : template).replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? '');
  return { citation: { text, url, license: page.license ?? source.license ?? null, archive }, missing };
}

/** What `numberSources` numbers: a line's source (structurally `Source` in questionMatch). */
export interface NumberedSource { name: string; url: string | null }

/**
 * One number per cited page, 1..n in order of first use: a source is its `url`, or its
 * `name` when it has none. So two Wikipedia articles are two sources (each entry is one
 * full citation), and a page backing three lines shows one number three times.
 * `marks[i]` is line i's number (null: the line has no source); `list[n - 1]` is source n.
 */
export function numberSources<S extends NumberedSource>(sources: ReadonlyArray<S | null>): { marks: Array<number | null>; list: S[] } {
  const numbers = new Map<string, number>();
  const list: S[] = [];
  const marks = sources.map(source => {
    if (!source) return null;
    const id = source.url ?? `name:${source.name}`;
    let number = numbers.get(id);
    if (number === undefined) {
      list.push(source);
      number = list.length;
      numbers.set(id, number);
    }
    return number;
  });
  return { marks, list };
}
