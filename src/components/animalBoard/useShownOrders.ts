// What the evidence grid shows of each clue order (plan 044). The rules count a
// match's gems the moment it clears, a beat before the board animates it, so the
// grid trails them: each color cleared sends one gem flying from the board to its
// column's Mystery cell, and the count catches up when it lands, or once the board
// settles. The answer stamps when the count looks full. Reduced motion: no flight,
// no lag. The rules' own counts stay on the cell (data-have) for tests.
import { useEffect, useRef, useState } from 'react';
import type { AnimalRound } from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import { EventBus, type EventPayloads } from '@/game/EventBus';
import { EMOJI_FONT, FACE_GLYPH } from '@/game/faceGlyphs';
import type { GemType } from '@/game/constants';

const FLIGHT_MS = 600;

/** A gem (its face drawn the way FaceIcon draws it) flying from a point on the board to an element. */
function flyGem(from: { x: number; y: number }, target: Element, gem: GemType, face: string): Promise<void> {
  const to = target.getBoundingClientRect();
  const size = 26;
  const el = document.createElement('span');
  el.className = 'ev-fly';
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, { left: `${from.x - size / 2}px`, top: `${from.y - size / 2}px`, width: `${size}px`, height: `${size}px` });
  const img = document.createElement('img');
  img.src = `/assets/evidence/${gem}.svg`;
  img.alt = '';
  el.append(img);
  const glyph = FACE_GLYPH[gem];
  const top = `${((glyph?.y ?? 64) / 128) * 100}%`;
  if (glyph) {
    const cover = document.createElement('span');
    const width = `${(glyph.radius / 64) * 100}%`;
    Object.assign(cover.style, { left: '50%', top, width, height: width, background: glyph.color, borderRadius: '9999px' });
    el.append(cover);
  }
  const text = document.createElement('span');
  text.textContent = face;
  Object.assign(text.style, { left: '50%', top, fontFamily: EMOJI_FONT, fontSize: '13px', lineHeight: '1' });
  el.append(text);
  document.body.append(el);
  const dx = to.left + to.width / 2 - from.x;
  const dy = to.top + to.height / 2 - from.y;
  const animation = el.animate([
    { transform: 'translate(0, 0) scale(1.2)' },
    { transform: `translate(${dx * 0.3}px, ${dy * 0.55 - 30}px) scale(1)`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.7)` },
  ], { duration: FLIGHT_MS, easing: 'cubic-bezier(.45, 0, .55, 1)', fill: 'both' });
  return animation.finished.then(() => el.remove(), () => el.remove());
}

export function useShownOrders(round: AnimalRound | undefined, roundNo: number | undefined): number[] {
  const [shown, setShown] = useState<number[]>([]);
  const [still, setStill] = useState(false);
  const roundRef = useRef(round);
  const shownRef = useRef(shown);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { shownRef.current = shown; }, [shown]);
  useEffect(() => {
    try { setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { /* animate */ }
  }, []);

  // Each round starts from the rules' counts (none).
  useEffect(() => setShown(roundRef.current?.orders.map(order => order.have) ?? []), [roundNo]);

  useEffect(() => {
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const catchUp = (only?: number) => setShown(before => (roundRef.current?.orders ?? []).map((order, i) =>
      (only === undefined || only === i ? Math.max(before[i] ?? 0, order.have) : before[i] ?? 0)));
    const onMatched = ({ from = [] }: EventPayloads['gems-matched']) => {
      const current = roundRef.current;
      if (!current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      for (const point of from) {
        const i = current.orders.findIndex(order => order.gem === point.gemType);
        if (i < 0 || (shownRef.current[i] ?? 0) >= current.rules.orderSize) continue;
        const order = current.orders[i];
        const target = document.querySelector(`[data-flight-target="${order.tag}"]`);
        if (target) void flyGem(point, target, order.gem, clueFace(order.tag)).then(() => catchUp(i));
      }
    };
    // Whatever didn't fly (or is still flying) shows once the move is over.
    const onSettled = () => { clearTimeout(settleTimer); settleTimer = setTimeout(() => catchUp(), FLIGHT_MS); };
    EventBus.on('gems-matched', onMatched);
    EventBus.on('clue-board-settled', onSettled);
    return () => {
      clearTimeout(settleTimer);
      EventBus.off('gems-matched', onMatched);
      EventBus.off('clue-board-settled', onSettled);
    };
  }, []);

  if (!round) return [];
  return still ? round.orders.map(order => order.have) : round.orders.map((order, i) => Math.min(shown[i] ?? 0, order.have));
}
