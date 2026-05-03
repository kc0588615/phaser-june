import type { WdpaDesignationCategory } from '@/types/waypoints';

const CATEGORY_PATTERNS: Array<[WdpaDesignationCategory, RegExp]> = [
  ['habitat_directive', /\b(habitat|birds)\s+directive\b|natura\s*2000|special\s+(area|protection|conservation)/i],
  ['heritage', /\b(world\s+heritage|heritage|biosphere|ramsar|unesco)\b/i],
  ['community', /\b(community|indigenous|local|communal|aboriginal|first\s+nation|native|tribal)\b/i],
  ['national_park', /\b(national\s+park|np)\b/i],
  ['nature_reserve', /\b(nature|strict|scientific|ecological|forest|wildlife|game)\s+reserve\b|\breserve\b/i],
  ['natural_monument', /\b(natural\s+monument|monument|landmark|feature)\b/i],
  ['landscape', /\b(landscape|seascape|recreation|scenic|park)\b/i],
];

export function classifyWdpaDesignation(input: {
  desigEng?: string | null;
  iucnCat?: string | null;
  govType?: string | null;
}): WdpaDesignationCategory {
  const desigEng = input.desigEng ?? '';
  const iucnCat = input.iucnCat ?? '';
  const govType = input.govType ?? '';
  const text = `${desigEng} ${iucnCat} ${govType}`;

  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }

  if (/^i[ab]?$/i.test(iucnCat)) return 'nature_reserve';
  if (/^ii$/i.test(iucnCat)) return 'national_park';
  if (/^iii$/i.test(iucnCat)) return 'natural_monument';
  if (/^v$/i.test(iucnCat)) return 'landscape';
  if (/community|indigenous|local/i.test(govType)) return 'community';

  return 'protected_area';
}

export const WDPA_CATEGORY_PRIORITY: Record<WdpaDesignationCategory, number> = {
  national_park: 60,
  heritage: 56,
  nature_reserve: 52,
  natural_monument: 48,
  landscape: 42,
  community: 40,
  habitat_directive: 38,
  protected_area: 32,
};
