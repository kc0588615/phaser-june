// The bottom drawer every game sheet sits in (cc Drawer): backdrop, title with an X, scrolling body, and a footer
// for the sheet's own action (X or Escape closes it). `before`/`after`: buttons either side of the title, `detail`:
// a line under it, `center`: centre the title. `modeless`: no backdrop and a shorter drawer, so the page above stays
// visible and tappable (the field guide over the evidence grid, plan 045). `top`: a modeless drawer reaches up to this y (px).
import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { backdropMotion, drawerUpMotion, useOverlayPresence } from '@/lib/motion';
import { useEscapeKey } from './useEscapeKey';

export function Sheet({ title, onClose, children, footer, before, after, detail, center = false, modeless = false, top }: {
  title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode;
  before?: ReactNode; after?: ReactNode; detail?: ReactNode; center?: boolean; modeless?: boolean; top?: number;
}) {
  useEscapeKey(onClose);
  const titleId = useId();
  const presence = useOverlayPresence();
  return (
    <div className={`fixed inset-0 z-[8200] flex items-end justify-center ${modeless ? 'pointer-events-none' : ''}`} {...presence} {...(modeless ? { 'aria-modal': false } : {})} aria-labelledby={titleId} onClick={modeless ? undefined : onClose}>
      {!modeless && <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />}
      <motion.div className={`pointer-events-auto relative flex w-full max-w-md flex-col rounded-t-m bg-neutral-1 text-s text-neutral-10 shadow-m ${modeless ? 'max-h-[60dvh]' : 'max-h-[85dvh]'}`} style={modeless && top !== undefined ? { maxHeight: `calc(100dvh - ${top}px)` } : undefined} onClick={event => event.stopPropagation()} {...drawerUpMotion}>
        <div className={`flex items-center gap-xxs pr-s pt-s ${before ? 'pl-s' : 'pl-l'}`}>
          {before}
          <div className={`flex min-w-0 flex-1 flex-col gap-xxs ${center ? 'items-center text-center' : ''}`}>
            <h2 id={titleId} className="m-0 flex items-center gap-xs text-m font-medium">{title}</h2>
            {detail}
          </div>
          {after}
          <button type="button" onClick={onClose} className="btn btn-icon ml-xxs shrink-0 bg-neutral-3 text-neutral-10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-l pt-s ${footer ? 'pb-s' : 'pb-[max(var(--space-l),env(safe-area-inset-bottom))]'}`}>
          {children}
        </div>
        {footer && (
          <div className="flex gap-xs px-l pb-[max(var(--space-m),env(safe-area-inset-bottom))] pt-s shadow-[inset_0_1px_0_0_var(--neutral-4)]">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
