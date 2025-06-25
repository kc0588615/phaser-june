import Phaser from 'phaser';
import { AssetKeys } from '../constants';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create(): void {
        console.log("MainMenu: create");
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Background
        if (this.textures.exists(AssetKeys.BACKGROUND)) {
            this.add.image(centerX, centerY, AssetKeys.BACKGROUND).setOrigin(0.5);
        } else {
            console.warn("Background texture not found in MainMenu scene.");
            this.cameras.main.setBackgroundColor('#3498db'); // Fallback color
        }

        // Logo
        if (this.textures.exists(AssetKeys.LOGO)) {
            this.add.image(centerX, centerY * 0.6, AssetKeys.LOGO).setOrigin(0.5).setScale(0.8); // Adjust position/scale
        } else {
             console.warn("Logo texture not found in MainMenu scene.");
        }

        // Title Text
        this.add.text(centerX, centerY, 'Phaser Match-3', {
            fontFamily: 'Arial Black', // Use a web-safe font or load custom
            fontSize: `${Math.min(width * 0.08, height * 0.1)}px`, // Responsive font size with 'px'
            color: '#ffffff',
            stroke: '#111111',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        // Play Button
        const playButton = this.add.text(centerX, centerY * 1.4, 'Play Game', {
            fontFamily: 'Arial',
            fontSize: `${Math.min(width * 0.05, height * 0.06)}px`,
            color: '#ffffff',
            backgroundColor: '#4CAF50',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        // High Scores Button
        const highScoresButton = this.add.text(centerX, centerY * 1.65, 'High Scores', {
            fontFamily: 'Arial',
            fontSize: `${Math.min(width * 0.04, height * 0.05)}px`,
            color: '#ffffff',
            backgroundColor: '#2196F3',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        // Button hover effects
        playButton.on('pointerover', () => {
            playButton.setStyle({ backgroundColor: '#5CBF60' });
        });
        playButton.on('pointerout', () => {
            playButton.setStyle({ backgroundColor: '#4CAF50' });
        });

        highScoresButton.on('pointerover', () => {
            highScoresButton.setStyle({ backgroundColor: '#42A5F5' });
        });
        highScoresButton.on('pointerout', () => {
            highScoresButton.setStyle({ backgroundColor: '#2196F3' });
        });

        // Simple pulse effect for the play button
        this.tweens.add({
            targets: playButton,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Play button click handler
        playButton.on('pointerdown', () => {
            console.log("MainMenu: Starting Game scene...");
            // Add a brief fade out effect (optional)
             this.cameras.main.fadeOut(250, 0, 0, 0, (camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
                 if (progress === 1) {
                      this.scene.start('Game');
                 }
             });
        });

        // High Scores button click handler
        highScoresButton.on('pointerdown', () => {
            console.log("MainMenu: Navigating to High Scores...");
            window.location.href = '/highscores';
        });
    }
}
