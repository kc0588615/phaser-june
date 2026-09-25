// PhaserGame — the thin React wrapper around the Phaser engine. It boots the
// board once into #game-container and reports the running scene. Everything
// else between React and Phaser goes through the EventBus.
import { useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './game/main';
import { EventBus } from './game/EventBus';

interface Props {
    /** Called each time a board scene is ready (also after a hot reload). */
    currentActiveScene?: (scene: Phaser.Scene) => void;
    /** Classes for #game-container; Phaser sizes the canvas to it. */
    className?: string;
}

export function PhaserGame({ currentActiveScene, className }: Props) {
    const game = useRef<Phaser.Game | null>(null);

    useLayoutEffect(() => {
        game.current ??= StartGame('game-container');
        return () => {
            game.current?.destroy(true);
            game.current = null;
        };
    }, []);

    // Latest callback in a ref: subscribe once, and remove only our own handler.
    const onScene = useRef(currentActiveScene);
    useEffect(() => { onScene.current = currentActiveScene; }, [currentActiveScene]);
    useEffect(() => {
        const handler = (scene: Phaser.Scene) => onScene.current?.(scene);
        EventBus.on('current-scene-ready', handler);
        return () => { EventBus.off('current-scene-ready', handler); };
    }, []);

    return <div id="game-container" className={className} />;
}
