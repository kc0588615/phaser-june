// When and how the evidence grid's rows take a new order: `drawn` follows `live` unless `hold` says to wait (a move is
// still playing out, the round is over) or a finger is down on the grid, so a row never moves out from under one. Rows
// slide by the browser's own animation, not motion's `layout`, which can't pause: a press mid-slide holds them where they show.
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { reducedMotion } from '@/game/motion';
import { LARGE_WEB } from '@/lib/motion';

export function useRowOrder(live: number[], hold: boolean) {
  const [drawn, setDrawn] = useState(live);
  const [pressed, setPressed] = useState(false);
  const fingers = useRef(new Set<number>());
  const body = useRef<HTMLTableSectionElement>(null);
  const slides = useRef<Animation[]>([]);
  const onPointerDownCapture = (event: ReactPointerEvent) => {
    fingers.current.add(event.pointerId);
    setPressed(true);
    for (const slide of slides.current) if (slide.playState === 'running') slide.pause();
  };
  // On the window, so a finger that slid off its row (or whose button captured it) still counts as lifted. In a timer, so
  // this lift's click lands first: Chromium drops a mouse click whose pressed row has been re-inserted.
  useEffect(() => {
    const lift = (event: PointerEvent) => {
      if (!fingers.current.delete(event.pointerId)) return;
      window.setTimeout(() => {
        if (fingers.current.size > 0) return;
        setPressed(false);
        for (const slide of slides.current) if (slide.playState === 'paused') slide.play();
      }, 0);
    };
    window.addEventListener('pointerup', lift, true);
    window.addEventListener('pointercancel', lift, true);
    return () => {
      window.removeEventListener('pointerup', lift, true);
      window.removeEventListener('pointercancel', lift, true);
    };
  }, []);
  const rows = () => [...(body.current?.querySelectorAll<HTMLElement>('tr[data-suspect]') ?? [])];
  const before = useRef<{ focused: Element | null; tops: Map<HTMLElement, number> } | null>(null);
  useLayoutEffect(() => {
    if (hold || pressed || live.every((id, i) => id === drawn[i])) return;
    before.current = { focused: document.activeElement, tops: new Map(rows().map(row => [row, row.getBoundingClientRect().top])) };
    setDrawn(live);
  }, [live, drawn, hold, pressed]);
  useLayoutEffect(() => {
    const was = before.current;
    if (!was) return;
    before.current = null;
    // React moves a row by re-inserting its DOM node, which drops focus from anything inside it: put it back.
    if (was.focused instanceof HTMLElement && was.focused.isConnected && document.activeElement !== was.focused) was.focused.focus({ preventScroll: true });
    if (reducedMotion()) return;
    // Each row slides from where it showed (mid-slide, if it was) to its new place.
    for (const slide of slides.current) slide.cancel();
    slides.current = rows().flatMap(row => {
      const dy = (was.tops.get(row) ?? 0) - row.getBoundingClientRect().top;
      return dy === 0 ? [] : [row.animate({ transform: [`translateY(${dy}px)`, 'none'] }, LARGE_WEB)];
    });
  }, [drawn]);
  return { drawn, body, onPointerDownCapture };
}
