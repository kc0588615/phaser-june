// The React host for the Phaser board: boots it once into this div. Everything
// else between React and Phaser goes through the EventBus.
import { useEffect, useRef } from 'react';
import StartGame from '@/game/main';

/** `className` sizes the board: Phaser fits the canvas to this div. */
export function PhaserGame({ className }: { className?: string }) {
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const game = StartGame(container.current!);
        return () => game.destroy(true);
    }, []);
    // touch-none: dragging on the board never scrolls or zooms the page.
    return <div ref={container} className={`touch-none ${className ?? ''}`} />;
}
