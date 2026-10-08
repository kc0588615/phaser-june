// The bottom drawer every game sheet sits in (cc Drawer): backdrop, title, scrolling body, footer with Close.
import { useId, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { backdropMotion, drawerUpMotion, useOverlayPresence } from '@/lib/motion';
import { useEscapeKey } from './useEscapeKey';

export function Sheet({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscapeKey(onClose);
  const titleId = useId();
  const presence = useOverlayPresence();
  return (
    <div className="fixed inset-0 z-[8200] flex items-end justify-center" {...presence} aria-labelledby={titleId} onClick={onClose}>
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.div className="relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-m bg-neutral-1 text-s text-neutral-10 shadow-m" onClick={event => event.stopPropagation()} {...drawerUpMotion}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-l pb-xs">
          <h2 id={titleId} className="m-0 mb-xs text-m font-medium">{title}</h2>
          {children}
        </div>
        <div className="flex gap-xs px-l pb-[max(var(--space-m),env(safe-area-inset-bottom))] pt-xs">
          {footer}
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Close</button>
        </div>
      </motion.div>
    </div>
  );
}
