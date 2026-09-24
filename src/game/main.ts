// Phaser boot config. Each page boots one game mode:
//   expedition: Boot -> Preloader -> Game (the expedition board); MainMenu/GameOver for free play
//   clue:       Boot -> Preloader -> ClueBoard (Clue Match)
import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { ClueBoardScene } from './scenes/ClueBoardScene';
import Phaser from 'phaser';
import { Preloader } from './scenes/Preloader';

export type GameMode = 'expedition' | 'clue';

const MODES: Record<GameMode, { scenes: Phaser.Types.Scenes.SceneType[]; startScene: string }> = {
    expedition: { scenes: [Boot, Preloader, MainMenu, Game, GameOver], startScene: 'Game' },
    clue: { scenes: [Boot, Preloader, ClueBoardScene], startScene: ClueBoardScene.KEY },
};

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO, // AUTO selects WebGL if available, otherwise Canvas
    parent: 'game-container', // Matches the div id in index.html
    backgroundColor: '#1a1a2e', // Dark blue/purple background from webpack config
    scale: {
        mode: Phaser.Scale.RESIZE, // Adjust game size to fit window/container
        parent: 'game-container', // Ensure this matches the parent ID
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the canvas
        autoRound: true, // Round pixel values for potentially crisper rendering
    },
    input: {
        activePointers: 1, // Allow only one active touch/mouse pointer
        touch: {
            capture: true, // Prevent default touch actions (like scroll) on the canvas
        }
    },
    render: {
        antialias: true, // Smoother edges for non-pixel art
        pixelArt: false, // Set to true if using pixel art assets and want sharp scaling
        roundPixels: true // Helps prevent sub-pixel jitter
    },
};

const StartGame = (parent: string, mode: GameMode = 'expedition'): Phaser.Game => {
    const { scenes, startScene } = MODES[mode];
    return new Phaser.Game({
        ...config,
        parent,
        scene: scenes,
        // Preloader reads these to pick its assets and the scene to start.
        callbacks: { preBoot: game => { game.registry.set('mode', mode); game.registry.set('startScene', startScene); } },
    });
}

export default StartGame;
