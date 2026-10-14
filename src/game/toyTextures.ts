// Textures for the toys a big match leaves (BoardModel `Special`), drawn once when the
// board scene starts: a line gem is its gem with a white arrow at each end of the line
// it clears, a blast gem its gem in a burst of eight white spikes (no other piece is
// that shape; rings mean animals and marks), and the color gem a disc of all five
// matching gems' colors. Arrows and spikes keep to the rim, clear of the gem's face.
// Same 128px size as the gem icons, so sprites scale alike.
import Phaser from 'phaser';
import { BOARD_GEMS } from '@/clueGame/animalBoard';
import type { Special } from './BoardModel';
import { GEM_COLOR, gemTexture, type GemType } from './constants';

const SIZE = 128;

export const toyTexture = (gem: GemType, special: Special): string => (special === 'color' ? 'toy_color' : `toy_${special}_${gem}`);

function drawLine(g: Phaser.GameObjects.Graphics, across: boolean): void {
  // Drawn as a row, then flipped for a column.
  const at = (x: number, y: number): [number, number] => (across ? [x, y] : [y, x]);
  for (const [color, alpha, grow] of [[0x06121a, 0.55, 3], [0xffffff, 0.95, 0]] as const) {
    g.fillStyle(color, alpha);
    g.fillTriangle(...at(2 - grow, 64), ...at(17 + grow, 36 - grow), ...at(17 + grow, 92 + grow));
    g.fillTriangle(...at(126 + grow, 64), ...at(111 - grow, 36 - grow), ...at(111 - grow, 92 + grow));
  }
}

function drawBurst(g: Phaser.GameObjects.Graphics): void {
  for (const [color, alpha, grow] of [[0x06121a, 0.55, 4], [0xffffff, 0.95, 0]] as const) {
    g.fillStyle(color, alpha);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const point = (r: number, da: number): [number, number] => [64 + r * Math.cos(a + da), 64 + r * Math.sin(a + da)];
      const spread = 0.3 + grow * 0.015;
      g.fillTriangle(...point(62 + grow * 0.5, 0), ...point(46 - grow, -spread), ...point(46 - grow, spread));
    }
  }
}

/**
 * `base`: the texture a toy is drawn on (a round's face, plan 044); `rebuild`: replace toys already drawn (call only
 * when no sprite shows them, between boards).
 */
export function makeToyTextures(scene: Phaser.Scene, gems: readonly GemType[], base: (gem: GemType) => string = gemTexture, rebuild = false): void {
  for (const gem of gems) {
    for (const special of ['row', 'column', 'bomb'] as const) {
      const key = toyTexture(gem, special);
      if (rebuild && scene.textures.exists(key)) scene.textures.remove(key);
      if (scene.textures.exists(key) || !scene.textures.exists(base(gem))) continue;
      const texture = scene.textures.addDynamicTexture(key, SIZE, SIZE);
      if (!texture) continue;
      texture.stamp(base(gem), undefined, SIZE / 2, SIZE / 2);
      const g = scene.make.graphics({}, false);
      if (special === 'bomb') drawBurst(g);
      else drawLine(g, special === 'row');
      texture.draw(g, 0, 0);
      g.destroy();
    }
  }
  if (!scene.textures.exists('toy_color')) {
    const texture = scene.textures.addDynamicTexture('toy_color', SIZE, SIZE);
    if (!texture) return;
    const g = scene.make.graphics({}, false);
    g.fillStyle(0x06121a, 1).fillCircle(64, 64, 60);
    BOARD_GEMS.forEach((gem, i) => {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(GEM_COLOR[gem] ?? '#ffffff').color, 1);
      g.slice(64, 64, 54, Phaser.Math.DegToRad(i * 72 - 90), Phaser.Math.DegToRad((i + 1) * 72 - 90), false);
      g.fillPath();
    });
    g.lineStyle(6, 0xffffff, 1).strokeCircle(64, 64, 55);
    g.fillStyle(0xffffff, 1).fillCircle(64, 64, 15);
    texture.draw(g, 0, 0);
    g.destroy();
  }
}
