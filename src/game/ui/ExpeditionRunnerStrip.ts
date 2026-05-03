import Phaser from 'phaser';
import { getGemDefinition, type GemType } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import { affinitySetBuffsGem } from '@/expedition/affinities';
import type { SpookTier } from '@/types/expedition';
import { formatNodeObstacleLabel, type NodeObstacle } from '@/game/nodeObstacles';

type RunnerResult = 'success' | 'escaped';

const SCIENTIST_TEXTURES = ['runner_scientist_0', 'runner_scientist_1'] as const;
const NODE_TEXTURE = 'runner_node_marker';
const GROUND_TEXTURE = 'runner_ground_tile';

const OBSTACLE_BADGE_META: Record<NodeObstacle, { short: string; color: number }> = {
    flow_shift: { short: 'FLOW', color: 0x38bdf8 },
    mud_tiles: { short: 'MUD', color: 0x8b5a2b },
    overgrowth: { short: 'VINE', color: 0x4f8f3a },
    low_visibility: { short: 'FOG', color: 0x94a3b8 },
    junk_blockers: { short: 'JUNK', color: 0x6b7280 },
    noise_interference: { short: 'NOISE', color: 0xf59e0b },
    steep_terrain: { short: 'RIDGE', color: 0x7c7c84 },
    time_pressure: { short: 'RUSH', color: 0xef4444 },
    signal_dropout: { short: 'DROP', color: 0x22d3ee },
    unknown_terrain: { short: 'UNK', color: 0xa855f7 },
    limited_signal: { short: 'SIGNAL', color: 0xe2e8f0 },
};

export class ExpeditionRunnerStrip {
    private readonly scene: Phaser.Scene;
    private readonly root: Phaser.GameObjects.Container;
    private readonly sky: Phaser.GameObjects.Rectangle;
    private readonly horizon: Phaser.GameObjects.Rectangle;
    private readonly trail: Phaser.GameObjects.TileSprite;
    private readonly scientistShadow: Phaser.GameObjects.Ellipse;
    private readonly scientist: Phaser.GameObjects.Sprite;
    private readonly nodeMarker: Phaser.GameObjects.Image;
    private readonly titleText: Phaser.GameObjects.Text;
    private readonly subtitleText: Phaser.GameObjects.Text;
    private readonly statusText: Phaser.GameObjects.Text;

    private width = 0;
    private height = 0;
    private trackStartX = 20;
    private trackEndX = 180;
    private trackY = 60;
    private targetProgress = 0;
    private displayProgress = 0;
    private active = false;
    private spookTier: SpookTier = 'stabilized';
    private nodeTitle = 'Transit';
    private objectiveText = 'Awaiting expedition site';
    private statusMessage = 'Ready';
    private lastFrameSwapAt = 0;
    private frameIndex = 0;
    private encounterPulseUntil = 0;
    private statusResetAt = 0;
    private obstacleBadges: Phaser.GameObjects.Container[] = [];
    private destroyed = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.ensureGeneratedTextures();

        this.sky = scene.add.rectangle(0, 0, 10, 10, 0x10253d, 0.95).setOrigin(0, 0);
        this.horizon = scene.add.rectangle(0, 0, 10, 18, 0x1d4f59, 0.95).setOrigin(0, 1);
        this.trail = scene.add.tileSprite(0, 0, 10, 12, GROUND_TEXTURE).setOrigin(0, 1);
        this.scientistShadow = scene.add.ellipse(0, 0, 18, 6, 0x020617, 0.35).setOrigin(0.5, 0.5);
        this.scientist = scene.add.sprite(0, 0, SCIENTIST_TEXTURES[0]).setOrigin(0.5, 1);
        this.nodeMarker = scene.add.image(0, 0, NODE_TEXTURE).setOrigin(0.5, 1);

        this.titleText = scene.add.text(12, 8, 'Transit', {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#f8fafc',
        }).setOrigin(0, 0);
        this.subtitleText = scene.add.text(12, 26, 'Awaiting expedition site', {
            fontSize: '11px',
            color: '#cbd5e1',
        }).setOrigin(0, 0);
        this.statusText = scene.add.text(0, 0, 'Ready', {
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#67e8f9',
            align: 'right',
        }).setOrigin(1, 0);

        this.root = scene.add.container(0, 0, [
            this.sky,
            this.horizon,
            this.trail,
            this.scientistShadow,
            this.nodeMarker,
            this.scientist,
            this.titleText,
            this.subtitleText,
            this.statusText,
        ]);
        this.root.setDepth(85);
        this.root.setScrollFactor(0);

        this.setIdle();
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.handleUpdate, this);
    }

    setLayout(x: number, y: number, width: number, height: number): void {
        if (!this.canMutate()) return;

        this.root.setPosition(x, y);
        this.width = Math.max(120, width);
        this.height = Math.max(48, height);
        this.trackStartX = 26;
        this.trackEndX = this.width - 34;
        this.trackY = this.height - 18;

        this.sky.setSize(this.width, this.height);
        this.horizon.setPosition(0, this.trackY - 6).setSize(this.width, 20);
        this.trail.setPosition(12, this.trackY + 4).setSize(this.width - 24, 12);
        this.titleText.setPosition(12, 8);
        this.subtitleText.setPosition(12, 26);
        this.statusText.setPosition(this.width - 12, 10);

        this.layoutObstacleBadges();
        this.syncVisualState(this.scene.time.now);
    }

    setIdle(message: string = 'Awaiting expedition site'): void {
        if (!this.canMutate()) return;

        this.active = false;
        this.targetProgress = 0;
        this.displayProgress = 0;
        this.frameIndex = 0;
        this.nodeTitle = 'Transit';
        this.objectiveText = message;
        this.statusMessage = 'Field board idle';
        this.spookTier = 'stabilized';
        this.encounterPulseUntil = 0;
        this.statusResetAt = 0;
        this.clearObstacleBadges();
        this.applyTierPalette();
        this.syncText();
        this.syncVisualState(this.scene.time.now);
    }

    setNode(config: {
        nodeIndex: number;
        objectiveTarget: number;
        obstacles: NodeObstacle[];
        counterGem: GemType | null;
        activeAffinities: AffinityType[];
        requiredGems: GemType[];
    }): void {
        if (!this.canMutate()) return;

        this.active = true;
        this.targetProgress = config.objectiveTarget > 0 ? 0 : 0.92;
        this.displayProgress = config.objectiveTarget > 0 ? 0 : 0.92;
        this.frameIndex = 0;
        this.encounterPulseUntil = 0;
        this.statusResetAt = 0;
        this.spookTier = 'stabilized';

        this.nodeTitle = config.objectiveTarget > 0
            ? `Node ${config.nodeIndex + 1}`
            : `Analysis ${config.nodeIndex + 1}`;

        if (config.objectiveTarget > 0 && config.counterGem) {
            const label = getGemDefinition(config.counterGem).label;
            this.objectiveText = affinitySetBuffsGem(config.activeAffinities, config.counterGem)
                ? `Match ${label} x2`
                : `Match ${label}`;
        } else {
            this.objectiveText = 'Review evidence and prepare your guess';
        }

        this.statusMessage = 'Tracking stable';
        this.setObstacleBadges(config.obstacles);
        this.applyTierPalette();
        this.syncText();
        this.syncVisualState(this.scene.time.now);
    }

    setObjectiveProgress(progress: number, target: number): void {
        if (!this.canMutate()) return;

        if (target <= 0) {
            this.targetProgress = 0.92;
            return;
        }
        this.targetProgress = Phaser.Math.Clamp(progress / Math.max(target, 1), 0, 1);
    }

    setSpook(pct: number, tier: SpookTier): void {
        if (!this.canMutate()) return;

        this.spookTier = tier;
        if (tier === 'stabilized') {
            this.statusMessage = `Tracking stable ${(pct * 100).toFixed(0)}%`;
        } else if (tier === 'spooked') {
            this.statusMessage = `Animal spooked ${(pct * 100).toFixed(0)}%`;
        } else {
            this.statusMessage = 'Animal escaping';
        }
        this.applyTierPalette();
        this.syncText();
    }

    pulseEncounter(eventKey: string): void {
        if (!this.canMutate()) return;

        this.encounterPulseUntil = this.scene.time.now + 1400;
        this.statusMessage = `Encounter: ${eventKey.replace(/_/g, ' ')}`;
        this.statusResetAt = this.scene.time.now + 1800;
        this.syncText();
    }

    markResolved(result: RunnerResult): void {
        if (!this.canMutate()) return;

        if (result === 'success') {
            this.targetProgress = 1;
            this.statusMessage = 'Node stabilized';
        } else {
            this.statusMessage = 'Animal escaped to camp';
            this.spookTier = 'escaped';
        }
        this.applyTierPalette();
        this.syncText();
    }

    destroy(): void {
        if (this.destroyed) return;

        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.handleUpdate, this);
        this.clearObstacleBadges();
        if (this.root.active) {
            this.root.destroy(true);
        }
        this.destroyed = true;
    }

    private handleUpdate(time: number, delta: number): void {
        if (!this.canMutate()) return;

        if (this.statusResetAt > 0 && time >= this.statusResetAt) {
            this.statusResetAt = 0;
            this.statusMessage = this.spookTier === 'stabilized'
                ? 'Tracking stable'
                : this.spookTier === 'spooked'
                    ? 'Animal spooked'
                    : 'Animal escaping';
            this.syncText();
        }

        const progressLerp = this.active ? 0.12 : 0.18;
        this.displayProgress = Phaser.Math.Linear(this.displayProgress, this.targetProgress, progressLerp);

        if (this.active) {
            this.trail.tilePositionX += delta * 0.08;
            if (time - this.lastFrameSwapAt >= 170) {
                this.lastFrameSwapAt = time;
                this.frameIndex = (this.frameIndex + 1) % SCIENTIST_TEXTURES.length;
                this.scientist.setTexture(SCIENTIST_TEXTURES[this.frameIndex]);
            }
        } else {
            this.scientist.setTexture(SCIENTIST_TEXTURES[0]);
        }

        this.syncVisualState(time);
    }

    private syncVisualState(time: number): void {
        if (!this.canMutate()) return;

        const x = Phaser.Math.Linear(this.trackStartX, this.trackEndX, this.displayProgress);
        const bob = this.active ? Math.sin(time / 110) * 2 : 0;
        this.scientist.setPosition(x, this.trackY + 3 + bob);
        this.scientistShadow.setPosition(x, this.trackY + 4);
        this.nodeMarker.setPosition(this.trackEndX, this.trackY + 2);

        const pulse = this.encounterPulseUntil > time
            ? 1 + Math.sin(time / 80) * 0.06
            : 1 + Math.sin(time / 220) * 0.03;
        this.nodeMarker.setScale(pulse);

        for (const badge of this.obstacleBadges) {
            const progress = Number(badge.getData('progress') ?? 0);
            const passed = this.displayProgress > progress;
            badge.setAlpha(passed ? 0.4 : 1);
            badge.y = this.trackY - 20 - (passed ? 2 : 0);
        }
    }

    private syncText(): void {
        if (!this.canMutate()) return;

        try {
            this.titleText.setText(this.nodeTitle);
            this.subtitleText.setText(this.objectiveText);
            this.statusText.setText(this.statusMessage.toUpperCase());
        } catch {
            this.destroyed = true;
        }
    }

    private setObstacleBadges(obstacles: NodeObstacle[]): void {
        if (!this.canMutate()) return;

        this.clearObstacleBadges();
        for (const obstacle of obstacles) {
            const meta = OBSTACLE_BADGE_META[obstacle];
            const bg = this.scene.add.rectangle(0, 0, 44, 18, meta.color, 0.85)
                .setStrokeStyle(1, 0x020617, 0.8);
            const text = this.scene.add.text(0, 0, meta.short, {
                fontSize: '8px',
                fontStyle: 'bold',
                color: '#020617',
            }).setOrigin(0.5, 0.5);
            const badge = this.scene.add.container(0, 0, [bg, text]);
            badge.setSize(44, 18);
            badge.setData('tooltip', formatNodeObstacleLabel(obstacle));
            this.root.add(badge);
            this.obstacleBadges.push(badge);
        }
        this.layoutObstacleBadges();
    }

    private layoutObstacleBadges(): void {
        if (!this.canMutate()) return;
        if (this.obstacleBadges.length === 0) return;

        const span = this.trackEndX - this.trackStartX;
        this.obstacleBadges.forEach((badge, index) => {
            const progress = (index + 1) / (this.obstacleBadges.length + 1);
            badge.setPosition(this.trackStartX + span * progress, this.trackY - 20);
            badge.setData('progress', progress);
        });
    }

    private clearObstacleBadges(): void {
        this.obstacleBadges.forEach((badge) => {
            if (badge.active) {
                badge.destroy(true);
            }
        });
        this.obstacleBadges = [];
    }

    private applyTierPalette(): void {
        if (!this.canMutate()) return;

        try {
            if (this.spookTier === 'stabilized') {
                this.sky.setFillStyle(0x10253d, 0.95);
                this.horizon.setFillStyle(0x1d4f59, 0.95);
                this.statusText.setColor('#67e8f9');
            } else if (this.spookTier === 'spooked') {
                this.sky.setFillStyle(0x3f2a1d, 0.95);
                this.horizon.setFillStyle(0x7c3f13, 0.95);
                this.statusText.setColor('#fbbf24');
            } else {
                this.sky.setFillStyle(0x3f1722, 0.95);
                this.horizon.setFillStyle(0x7f1d1d, 0.95);
                this.statusText.setColor('#f87171');
            }
        } catch {
            this.destroyed = true;
        }
    }

    private canMutate(): boolean {
        return !this.destroyed
            && this.root.active
            && this.sky.active
            && this.horizon.active
            && this.trail.active
            && this.scientistShadow.active
            && this.scientist.active
            && this.nodeMarker.active
            && this.titleText.active
            && this.subtitleText.active
            && this.statusText.active;
    }

    private ensureGeneratedTextures(): void {
        if (!this.scene.textures.exists(SCIENTIST_TEXTURES[0])) {
            this.generateScientistTexture(SCIENTIST_TEXTURES[0], false);
        }
        if (!this.scene.textures.exists(SCIENTIST_TEXTURES[1])) {
            this.generateScientistTexture(SCIENTIST_TEXTURES[1], true);
        }
        if (!this.scene.textures.exists(NODE_TEXTURE)) {
            const gfx = this.scene.add.graphics();
            gfx.fillStyle(0x1e293b, 1);
            gfx.fillRect(9, 14, 6, 14);
            gfx.fillStyle(0x0ea5e9, 1);
            gfx.fillTriangle(12, 0, 24, 12, 0, 12);
            gfx.fillStyle(0xf8fafc, 1);
            gfx.fillRect(10, 18, 4, 6);
            gfx.generateTexture(NODE_TEXTURE, 24, 28);
            gfx.destroy();
        }
        if (!this.scene.textures.exists(GROUND_TEXTURE)) {
            const gfx = this.scene.add.graphics();
            gfx.fillStyle(0x3f3f46, 1);
            gfx.fillRect(0, 0, 32, 12);
            gfx.fillStyle(0x71717a, 1);
            gfx.fillRect(0, 8, 32, 4);
            gfx.fillStyle(0x52525b, 1);
            gfx.fillRect(4, 2, 8, 2);
            gfx.fillRect(18, 4, 6, 2);
            gfx.generateTexture(GROUND_TEXTURE, 32, 12);
            gfx.destroy();
        }
    }

    private generateScientistTexture(key: string, altStride: boolean): void {
        const gfx = this.scene.add.graphics();

        gfx.fillStyle(0x0f172a, 1);
        gfx.fillRect(5, altStride ? 11 : 10, 3, 5);
        gfx.fillRect(8, altStride ? 10 : 11, 3, 5);

        gfx.fillStyle(0xeab308, 1);
        gfx.fillRect(4, 5, 8, 7);

        gfx.fillStyle(0x16a34a, 1);
        gfx.fillRect(3, 5, 2, 5);

        gfx.fillStyle(0x2563eb, 1);
        gfx.fillRect(5, 2, 6, 4);

        gfx.fillStyle(0xf8d2b3, 1);
        gfx.fillRect(6, 0, 4, 3);

        gfx.fillStyle(0x334155, 1);
        gfx.fillRect(4, 6, 8, 1);

        gfx.generateTexture(key, 16, 16);
        gfx.destroy();
    }
}
