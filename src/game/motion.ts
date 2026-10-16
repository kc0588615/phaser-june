/** The player asked for less motion: board effects fade in place instead of growing, drifting or shaking. */
export const reducedMotion = (): boolean => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
