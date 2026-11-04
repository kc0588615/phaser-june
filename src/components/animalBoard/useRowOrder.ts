// When the evidence grid's rows take a new order: `drawn` follows `live` unless `hold` says to wait (a move is still
// playing out, the round is over) or a finger is down on the grid, so a row never moves out from under one.
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export function useRowOrder(live: number[], hold: boolean): { drawn: number[]; onPointerDownCapture: (event: ReactPointerEvent) => void } {
  const [drawn, setDrawn] = useState(live);
  const [pressed, setPressed] = useState(false);
  const fingers = useRef(new Set<number>());
  const onPointerDownCapture = (event: ReactPointerEvent) => {
    fingers.current.add(event.pointerId);
    setPressed(true);
  };
  // On the window, so a finger that slid off its row (or whose button captured it) still counts as lifted.
  useEffect(() => {
    const lift = (event: PointerEvent) => {
      fingers.current.delete(event.pointerId);
      if (fingers.current.size === 0) setPressed(false);
    };
    window.addEventListener('pointerup', lift, true);
    window.addEventListener('pointercancel', lift, true);
    return () => {
      window.removeEventListener('pointerup', lift, true);
      window.removeEventListener('pointercancel', lift, true);
    };
  }, []);
  // React moves a row by re-inserting its DOM node, which drops focus from anything inside it: put it back.
  const focused = useRef<Element | null>(null);
  useLayoutEffect(() => {
    if (hold || pressed || live.every((id, i) => id === drawn[i])) return;
    focused.current = document.activeElement;
    setDrawn(live);
  }, [live, drawn, hold, pressed]);
  useLayoutEffect(() => {
    const element = focused.current;
    focused.current = null;
    if (element instanceof HTMLElement && element.isConnected && document.activeElement !== element) element.focus({ preventScroll: true });
  }, [drawn]);
  return { drawn, onPointerDownCapture };
}
