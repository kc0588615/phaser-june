// cc motion for motion/react (gui/themes/cc.md "animation"; the CSS twins are --motion-* in globals.css).
// Small: controls, menus, popovers. Large: dialogs, drawers, panels. Reduced motion: MotionConfig in _app.tsx.
import { useIsPresent, type Transition } from 'motion/react';

const EASE = [0.16, 1, 0.3, 1] as const;
const POPUP_SCALE = 0.96;

export const SMALL: Transition = { type: 'tween', duration: 0.16, ease: EASE };
export const LARGE: Transition = { type: 'tween', duration: 0.28, ease: EASE };

/** Spread onto motion elements: enter, exit and timing together. */
export const backdropMotion = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: LARGE };
export const drawerUpMotion = { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: LARGE };
export const drawerSideMotion = { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: LARGE };
export const dialogMotion = { initial: { opacity: 0, scale: POPUP_SCALE }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: POPUP_SCALE }, transition: LARGE };
export const popoverMotion = { initial: { opacity: 0, scale: POPUP_SCALE }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: POPUP_SCALE }, transition: SMALL };

/** A modal overlay's root attributes: a dialog while shown; while it animates out (AnimatePresence) it is
 *  hidden from assistive tech and lets taps through, so the screen behind is usable at once. */
export function useOverlayPresence() {
  const present = useIsPresent();
  return present
    ? { role: 'dialog' as const, 'aria-modal': true as const }
    : { 'aria-hidden': true as const, style: { pointerEvents: 'none' as const } };
}
