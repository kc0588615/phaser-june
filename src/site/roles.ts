// The site's text roles (plan 051 §4 "Shared roles"), as cc utility classes, so every page sets them the same way.
export const H1 = 'font-brand text-xl font-heavy md:text-xxl';
export const H2 = 'font-brand text-l font-heavy';
export const H3 = 'font-brand text-m font-heavy';
/** Secondary text: the line under a button, notes. Never cte-text-muted (4.04:1). */
export const NOTE = 'text-s text-neutral-8';
export const LINK = 'text-neutral-10 underline';
/** Running text's measure (45-75 characters). */
export const MEASURE = 'max-w-prose';
/** Around a screenshot: a tone step (not a line), so the game's own white panels keep an edge on the canvas. */
export const FRAME = 'rounded-l bg-neutral-3 p-xs';
