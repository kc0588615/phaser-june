// Phaser boot config: one scene, the Clue Match board.
import Phaser from 'phaser';
import { ClueBoardScene } from './ClueBoardScene';

export default function StartGame(parent: HTMLElement): Phaser.Game {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        backgroundColor: '#06121a',
        scale: {
            mode: Phaser.Scale.RESIZE, // the canvas follows its container's size
            width: '100%',
            height: '100%',
            autoRound: true,
        },
        render: { roundPixels: true },
        scene: [ClueBoardScene],
    });
}
