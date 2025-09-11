// src/game/ui/OwlSprite.ts
import Phaser from 'phaser';

export class OwlSprite {
    private scene: Phaser.Scene;
    private owl!: Phaser.GameObjects.Sprite;
    private scale: number;
    private margin = 12;
    private introDone = false;
    private boardOffsetX: number = 0;

    constructor(scene: Phaser.Scene, opts?: { scale?: number, boardOffsetX?: number }) {
        this.scene = scene;
        this.scale = opts?.scale ?? 4;
        this.boardOffsetX = opts?.boardOffsetX ?? 0;
    }

    static setupAnimations(scene: Phaser.Scene): void {
        const tex = scene.textures.get('owl');
        const cols = Math.floor((tex.source[0].width || 0) / 48) || 1;
        const COUNTS = { 
            idle: 4, blink: 10, takeoff: 16, flying: 8, landing: 14,
            walking: 11, sleeping: 4, alerted: 27, hurted: 5, wakingup: 7 
        };
        
        const row = (key: string, r: number, n: number, frameRate = 12, repeat = -1) => {
            const start = r * cols;
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames: scene.anims.generateFrameNumbers('owl', { start, end: start + n - 1 }),
                    frameRate,
                    repeat
                });
            }
        };
        
        row('owl_idle', 0, COUNTS.idle, 6, -1);
        row('owl_blink', 1, COUNTS.blink, 10, 0);
        row('owl_takeoff', 2, COUNTS.takeoff, 14, 0);
        row('owl_flying', 3, COUNTS.flying, 12, -1);
        row('owl_landing', 4, COUNTS.landing, 14, 0);
        row('owl_walking', 5, COUNTS.walking, 12, -1);
        row('owl_sleeping', 6, COUNTS.sleeping, 4, -1);
        row('owl_alerted', 7, COUNTS.alerted, 16, 0);
        row('owl_hurted', 8, COUNTS.hurted, 10, 0);
        row('owl_wakingup', 9, COUNTS.wakingup, 10, 0);
        
        if (!scene.anims.exists('owl_takeoff_fast')) {
            scene.anims.create({
                key: 'owl_takeoff_fast',
                frames: scene.anims.generateFrameNumbers('owl', { start: 2 * cols + 4, end: 2 * cols + COUNTS.takeoff - 1 }),
                frameRate: 16,
                repeat: 0
            });
        }
    }

    createAndRunIntro(): void {
        const scale = this.scale;
        const startX = this.scene.scale.width + 48 * scale;
        const startY = 48 * scale;
        const landX = Math.min(200, Math.max(120, this.scene.scale.width * 0.18));
        const landY = startY;
        const final = this.topLeftAnchor();

        this.owl = this.scene.add.sprite(startX, startY, 'owl', 0)
            .setScale(scale)
            .setOrigin(0, 1)  // Changed to left-bottom origin
            .setDepth(200); // Above board/UI

        this.owl.setFlipX(true).play('owl_flying');
        this.scene.tweens.add({
            targets: this.owl,
            x: landX,
            duration: 1200,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.owl.play('owl_landing');
                this.scene.time.delayedCall(900, () => {
                    this.owl.play('owl_walking');
                    this.scene.tweens.add({
                        targets: this.owl,
                        x: final.x,
                        duration: 800,
                        ease: 'Linear',
                        onComplete: () => {
                            this.owl.setFlipX(false);
                            this.owl.play('owl_blink');
                            this.owl.once('animationcomplete-owl_blink', () => {
                                this.owl.play('owl_idle');
                                this.introDone = true;
                                this.anchorTopLeft(); // snap exact
                            });
                        }
                    });
                });
            }
        });
    }

    anchorTopLeft(): void {
        if (!this.owl) return;
        const tl = this.topLeftAnchor();
        this.owl.setPosition(tl.x, tl.y);
    }

    setBoardOffsetX(offsetX: number): void {
        this.boardOffsetX = offsetX;
        this.anchorTopLeft();
    }

    private topLeftAnchor() {
        // Align owl's left edge directly with the board's left edge
        // Since owl origin is now (0, 1), no need for half-width adjustment
        const x = this.boardOffsetX;  // Directly use board offset for flush alignment
        const y = this.margin + (32 * this.scale); // baseline so feet sit near the margin
        return { x, y };
    }

    playAnimation(animationKey: string): void {
        if (this.owl && this.introDone) {
            this.owl.play(animationKey);
        }
    }

    isIntroComplete(): boolean {
        return this.introDone;
    }
}