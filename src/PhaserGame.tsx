// PhaserGame — the thin React wrapper around the Phaser engine.
//
// It boots Phaser exactly once (into the #game-container div) and exposes the
// game + current scene through a ref. React never reaches into Phaser beyond
// this; all gameplay communication goes through the EventBus.
import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame, { type GameMode } from './game/main';
import { EventBus } from './game/EventBus';

export interface IRefPhaserGame
{
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps
{
    currentActiveScene?: (scene_instance: Phaser.Scene) => void;
    /** Which scenes to boot; fixed for the component's lifetime. */
    mode?: GameMode;
    /** Classes for #game-container; Phaser sizes the canvas to it. */
    className?: string;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({ currentActiveScene, mode = 'expedition', className = 'relative z-game' }, ref)
{
    const game = useRef<Phaser.Game | null>(null!);

    useLayoutEffect(() =>
    {
        if (game.current === null)
        {

            game.current = StartGame("game-container", mode);

            if (typeof ref === 'function')
            {
                ref({ game: game.current, scene: null });
            } else if (ref)
            {
                ref.current = { game: game.current, scene: null };
            }

        }

        return () =>
        {
            if (game.current)
            {
                game.current.destroy(true);
                if (game.current !== null)
                {
                    game.current = null;
                }
            }
        }
    }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps -- mode is fixed per mount

    // Latest callback in a ref: subscribe once, and remove only our own handler.
    const onSceneRef = useRef(currentActiveScene);
    useEffect(() => { onSceneRef.current = currentActiveScene; }, [currentActiveScene]);

    useEffect(() =>
    {
        const onSceneReady = (scene_instance: Phaser.Scene) =>
        {
            onSceneRef.current?.(scene_instance);
            if (typeof ref === 'function') ref({ game: game.current, scene: scene_instance });
            else if (ref) ref.current = { game: game.current, scene: scene_instance };
        };
        EventBus.on('current-scene-ready', onSceneReady);
        return () => { EventBus.off('current-scene-ready', onSceneReady); };
    }, [ref]);

    return (
        <div id="game-container" className={className}></div>
    );

});
