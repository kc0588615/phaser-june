// A photo for an animal: the lead image of its English Wikipedia article, with
// license and author from Wikimedia Commons. Only licenses that allow reuse
// with credit (public domain, CC0, CC BY, CC BY-SA) are kept.
const HEADERS = { 'User-Agent': 'CritterConnect/1.0 (educational game; https://github.com/kc0588615/phaser-june)' };
const REUSABLE = /^(public domain|pd|cc0|cc[- ]by(-sa)?( \d(\.\d)?)?)/i;
const NOT_A_PHOTO = /(map|range|distribution|skeleton|skull|illustration|drawing|plate|diagram)/i;

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** The Commons file name, also when the summary gives a thumbnail (.../thumb/a/ab/<file>/3840px-<file>?utm...). */
function commonsFile(source: string): string {
  const parts = new URL(source).pathname.split('/');
  const thumb = parts.indexOf('thumb');
  return decodeURIComponent((thumb >= 0 ? parts[thumb + 3] : parts.at(-1)) ?? '');
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: HEADERS });
    return response.ok ? (await response.json()) as T : null;
  } catch (error) {
    console.error(`  ${url}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

export async function findPhoto(scientificName: string, commonName: string): Promise<{ url: string; credit: string; license: string; page: string } | null> {
  for (const title of [scientificName, commonName]) {
    const summary = await getJson<{ originalimage?: { source: string } }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    const source = summary?.originalimage?.source;
    if (!source) continue;
    const file = commonsFile(source);
    if (!file || NOT_A_PHOTO.test(file)) continue;
    const info = await getJson<{ query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }> }> } }>(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&titles=${encodeURIComponent(`File:${file}`)}`,
    );
    const image = Object.values(info?.query?.pages ?? {})[0]?.imageinfo?.[0];
    const license = image?.extmetadata?.LicenseShortName?.value ?? '';
    if (!image || !REUSABLE.test(license)) continue;
    const artist = stripHtml(image.extmetadata?.Artist?.value ?? '') || 'Unknown author';
    return { url: image.thumburl.split('?')[0], credit: artist.slice(0, 120), license, page: image.descriptionurl };
  }
  return null;
}
