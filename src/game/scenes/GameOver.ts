import Phaser from 'phaser';
import { AssetKeys } from '../constants';
import { supabase } from '@/lib/supabaseClient';

export class GameOver extends Phaser.Scene {
    private finalScore: number = 0;
    
    constructor() {
        super('GameOver');
    }

    init(data: { score?: number }) {
        this.finalScore = data.score || 0;
    }

    async saveScore(username: string, score: number): Promise<boolean> {
        try {
            const trimmedUsername = username.trim();
            if (trimmedUsername.length < 2 || trimmedUsername.length > 25) {
                alert('Username must be between 2 and 25 characters');
                return false;
            }

            const { data, error } = await supabase
                .from('high_scores')
                .insert([{ 
                    username: trimmedUsername, 
                    score
                }])
                .select()
                .single();

            if (error) {
                console.error("Supabase Error:", error.message);
                alert(`Error saving score: ${error.message}`);
                return false;
            }
            
            console.log("Score saved successfully!", data);
            return true;
        } catch (err: any) {
            console.error('Unexpected error:', err);
            alert('Could not connect to server');
            return false;
        }
    }

    create(): void {
        console.log("GameOver: create");
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Dim background
        this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.6).setOrigin(0.5);

        // Background Image (optional, faded)
        if (this.textures.exists(AssetKeys.BACKGROUND)) {
            this.add.image(centerX, centerY, AssetKeys.BACKGROUND).setOrigin(0.5).setAlpha(0.3);
        }

        // Game Over Text
        this.add.text(centerX, centerY * 0.6, 'Game Over', {
            fontFamily: 'Arial Black',
            fontSize: `${Math.min(width * 0.1, height * 0.15)}px`, // Ensure 'px' unit
            color: '#ff4444', // Red color
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Score display
        this.add.text(centerX, centerY * 0.9, `Final Score: ${this.finalScore}`, {
            fontFamily: 'Arial',
            fontSize: `${Math.min(width * 0.06, height * 0.08)}px`,
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        // Play Again button
        const playAgainButton = this.add.text(centerX, centerY * 1.2, 'Play Again', {
            fontFamily: 'Arial',
            fontSize: `${Math.min(width * 0.06, height * 0.08)}px`,
            color: '#ffffff',
            backgroundColor: '#3b82f6',
            padding: { x: 20, y: 10 },
            align: 'center'
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Save Score button
        const saveScoreButton = this.add.text(centerX, centerY * 1.5, 'Save Score & Menu', {
            fontFamily: 'Arial',
            fontSize: `${Math.min(width * 0.05, height * 0.06)}px`,
            color: '#eeeeee',
            backgroundColor: '#1e293b',
            padding: { x: 16, y: 8 },
            align: 'center'
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // Hover effects
        playAgainButton.on('pointerover', () => {
            playAgainButton.setScale(1.05);
        });
        playAgainButton.on('pointerout', () => {
            playAgainButton.setScale(1);
        });

        saveScoreButton.on('pointerover', () => {
            saveScoreButton.setScale(1.05);
        });
        saveScoreButton.on('pointerout', () => {
            saveScoreButton.setScale(1);
        });

        // Play Again handler - restart directly
        playAgainButton.on('pointerup', () => {
            console.log("GameOver: Restarting game...");
            this.cameras.main.fadeOut(250, 0, 0, 0, (camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
                if (progress === 1) {
                    this.scene.start('Game');
                }
            });
        });

        // Save Score handler
        saveScoreButton.on('pointerup', async () => {
            const username = prompt("Enter your name to save score (2-25 characters):", "Player");

            if (username && username.trim()) {
                await this.saveScore(username, this.finalScore);
            }
            
            console.log("GameOver: Returning to MainMenu...");
            this.cameras.main.fadeOut(250, 0, 0, 0, (camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
                if (progress === 1) {
                    this.scene.start('MainMenu');
                }
            });
        });
    }
}
