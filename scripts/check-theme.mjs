// cc theme drift check (GUI.md), run by `npm run lint`. Flags class names and colours in the
// React UI that bypass the theme. Tailwind's default font, text size, radius and shadow scales
// are reset in globals.css, so their classes render nothing; its colour palette and numeric
// spacing still work but skip the cc tokens.
//   node scripts/check-theme.mjs
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['src/components', 'src/pages'];
// Map paint (MapLibre/SVG range map) and the browser theme-color meta take literal colours.
const HEX_ALLOWED = new Set(['src/components/globe/Globe.tsx', 'src/components/clueGame/RangeMap.tsx', 'src/pages/_app.tsx']);

const COLOR_UTIL = '(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow)';
const RULES = [
  { name: 'Tailwind palette colour (use cc colour tokens)', re: new RegExp(`\\b${COLOR_UTIL}-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b|\\b${COLOR_UTIL}-(?:white|black)\\b`, 'g') },
  { name: 'old Night Field Guide token', re: /\b(?:bg|text|border|ring|fill|stroke)-(?:night|surface|raised|line|line-strong|mist|sage|action|leaf|moss|bark|river|globe|ochre|danger)\b/g },
  { name: 'Tailwind default size (renders nothing; use cc xxs-xxl)', re: /\btext-(?:sm|base|lg|[2-9]xl)\b|\brounded-(?:sm|md|lg|2xl|3xl)\b|\bshadow-(?:sm|md|lg|xl|2xl)\b|\bfont-(?:thin|light|normal|semibold|bold|extrabold|black)\b/g },
  { name: 'numeric spacing (use cc spacing: xxs-xxl)', re: /(?<![\w-])-?(?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(?:[1-9]\d*(?:\.5)?|0\.5)(?![\w.-])/g },
];
const HEX = /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|#[0-9a-fA-F]{3}\b|\brgba?\(/g;

const files = ROOTS.flatMap(function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
});

const problems = [];
for (const file of files) {
  const rel = file.split(path.sep).join('/');
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const rules = HEX_ALLOWED.has(rel) ? RULES : [...RULES, { name: 'literal colour (use a cc token)', re: HEX }];
    for (const { name, re } of rules) {
      for (const m of line.matchAll(re)) problems.push(`${rel}:${i + 1}  ${m[0]}  ${name}`);
    }
  });
}

if (problems.length) {
  console.error(`cc theme drift (GUI.md), ${problems.length}:\n${problems.join('\n')}`);
  process.exit(1);
}
