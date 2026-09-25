import Phaser from 'phaser';
import { GEM_TYPES, gemTexture } from '../constants';
import { ClueBoardScene } from './ClueBoardScene';

/** Loads the gem icons (public/assets/evidence/<color>.svg), then starts the board. */
export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload(): void {
        this.load.setBaseURL(window.location.origin);
        for (const type of GEM_TYPES) {
            this.load.svg(gemTexture(type), `assets/evidence/${type}.svg?v=018-2`, { width: 128, height: 128 });
        }
        this.load.on('loaderror', (file: Phaser.Loader.File) => console.error(`[Preloader] Failed to load ${file.key} from ${file.url}`));
    }

    create(): void {
        this.scene.start(ClueBoardScene.KEY);
    }
}
