// cc theme drift check (GUI.md), run by `npm run lint`. Flags class names and colours in the
// React UI that bypass the theme. Tailwind's default font, text size, radius and shadow scales
// are reset in globals.css, so their classes render nothing; its colour palette and numeric
// spacing still work but skip the cc tokens. Also checks the theme's own colours for WCAG 2.2 AA
// (owner 2026-11-01): text tokens on the surfaces, button labels, and edges, in both modes.
//   node scripts/check-theme.mjs
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['src/components', 'src/pages', 'src/site'];
// Map paint (MapLibre/SVG range map) takes literal colours.
const HEX_ALLOWED = new Set(['src/components/globe/Globe.tsx', 'src/components/clueGame/RangeMap.tsx']);

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

// WCAG 2.2 AA contrast of the theme's tokens (globals.css: light :root, dark overrides under [data-theme="dark"]).
const css = readFileSync('src/styles/globals.css', 'utf8');
const tokens = re => Object.fromEntries([...css.matchAll(re)].flatMap(([, body]) => [...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)\b/g)].map(([, name, hex]) => [name, hex])));
const light = tokens(/(?:^|\n)\s*:root\s*\{([^}]*)\}/g);
const dark = { ...light, ...tokens(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/g) };
const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
// A token's colour as it renders: 'name', or 'name over base' (a translucent token composited on base).
const color = (t, name) => {
  const [top, base] = name.split(' over ');
  const hex = t[top];
  if (!base) return hex;
  if (!hex || !t[base]) return undefined;
  const alpha = hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1;
  return `#${[1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * alpha + parseInt(t[base].slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
};
const SURFACES = ['neutral-1', 'neutral-2', 'neutral-3'];
// [foreground, backgrounds, minimum]. neutral-6 is left out: below 4.5:1 in light, it's for disabled states only.
const PAIRS = [
  ...['neutral-7', 'neutral-8', 'neutral-10', 'color-1', 'error'].map(fg => [fg, SURFACES, 4.5]), // text
  ['neutral-1', ['color-1', 'error'], 4.5], // .btn-primary and .btn-danger labels
  ['option-badge-foreground', ['option-badge-background'], 4.5],
  ['navigation-active-foreground', ['navigation-active-background'], 4.5],
  ['emphasis-icon-foreground', ['emphasis-icon-background'], 4.5],
  ['control-edge', SURFACES, 3], // edges that must show (dashed cells, the Camera cell, empty hearts)
  ['cte-focus', SURFACES, 3], // the focus ring
  // A selected fill (picked row, the field guide's yes): its text, green answer and dashed edge.
  ...[['neutral-7', 4.5], ['color-1', 4.5], ['control-edge', 3]].map(([fg, min]) => [fg, ['color-1-transparent over neutral-1'], min]),
];
for (const [mode, t] of [['light', light], ['dark', dark]]) {
  for (const [fg, bgs, min] of PAIRS) {
    for (const bg of bgs) {
      const [a, b] = [color(t, fg), color(t, bg)];
      if (!a || !b) { problems.push(`globals.css (${mode})  --${fg} on --${bg}: token missing`); continue; }
      const ratio = contrast(a, b);
      if (ratio < min) problems.push(`globals.css (${mode})  --${fg} ${a} on --${bg} ${b}: ${ratio.toFixed(2)}:1, needs ${min}:1 (WCAG 2.2 AA)`);
    }
  }
}

if (problems.length) {
  console.error(`cc theme check (GUI.md, WCAG 2.2 AA), ${problems.length}:\n${problems.join('\n')}`);
  process.exit(1);
}
