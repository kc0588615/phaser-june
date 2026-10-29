// Light or dark: the player's pick from the game menu, else the system's. The mode lives on
// <html data-theme>, which globals.css reads; THEME_SCRIPT sets it before first paint.
export type Theme = 'light' | 'dark';

const KEY = 'critter-connect:theme';

/** cc canvas (neutral-1) per mode, for the browser's theme-color meta; a meta tag can't read the CSS variable. */
export const THEME_COLORS: Record<Theme, string> = { light: '#ffffff', dark: '#051411' };

/** Inlined in _document: applies the saved pick (or the system mode, following its changes). */
export const THEME_SCRIPT = `(function(){var d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');function s(){var t;try{t=localStorage.getItem('${KEY}')}catch(e){}d.dataset.theme=t==='light'||t==='dark'?t:m.matches?'dark':'light'}s();m.addEventListener('change',s)})()`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try { window.localStorage.setItem(KEY, theme); } catch { /* kept for this visit only */ }
}
