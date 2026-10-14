// The React host for the Phaser board: boots it once into this div. Everything
// else between React and Phaser goes through the EventBus.
import { useEffect, useRef } from 'react';
import StartGame from '@/game/main';

/** `className` sizes the board: Phaser fits the canvas to this div. */
export function PhaserGame({ className }: { className?: string }) {
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const game = StartGame(container.current!);
        // Phaser can miss the div shrinking when the grid above it grows (it caches the div's size and only
        // re-fits on a change it measures itself), so re-measure, then re-fit, on every resize.
        const observer = new ResizeObserver(() => { game.scale.getParentBounds(); game.scale.refresh(); });
        observer.observe(container.current!);
        return () => { observer.disconnect(); game.destroy(true); };
    }, []);
    // touch-none: dragging on the board never scrolls or zooms the page.
    return <div ref={container} className={`touch-none ${className ?? ''}`} />;
}
