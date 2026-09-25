// Phaser boot config: Preloader loads the gem icons, then starts the Clue Match board.
import Phaser from 'phaser';
import { Preloader } from './scenes/Preloader';
import { ClueBoardScene } from './scenes/ClueBoardScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#06121a',
    scale: {
        mode: Phaser.Scale.RESIZE, // the canvas follows its container's size
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        autoRound: true,
    },
    input: {
        activePointers: 1,
        touch: { capture: true }, // no page scroll while dragging on the board
    },
    render: { antialias: true, pixelArt: false, roundPixels: true },
    scene: [Preloader, ClueBoardScene],
};

export default function StartGame(parent: string): Phaser.Game {
    return new Phaser.Game({ ...config, parent });
}
