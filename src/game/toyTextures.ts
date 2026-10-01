// Textures for the toys a big match leaves (BoardModel `Special`), drawn once when the
// board scene starts: a line gem is its gem with two white bars and arrows along the
// line it clears, a blast gem its gem in a white ring, and the color gem a disc of
// all five category colors. Same 128px size as the gem icons, so sprites scale alike.
import Phaser from 'phaser';
import { KIND_COLOR } from '@/clueGame/gems';
import { CHARGE_CATEGORIES } from '@/clueGame/questionMatch';
import type { Special } from './BoardModel';
import { gemTexture, type GemType } from './constants';

const SIZE = 128;

export const toyTexture = (gem: GemType, special: Special): string => (special === 'color' ? 'toy_color' : `toy_${special}_${gem}`);

function drawLine(g: Phaser.GameObjects.Graphics, across: boolean): void {
  // Drawn as a row, then flipped for a column.
  const at = (x: number, y: number): [number, number] => (across ? [x, y] : [y, x]);
  for (const [color, alpha, grow] of [[0x06121a, 0.55, 3], [0xffffff, 0.95, 0]] as const) {
    g.fillStyle(color, alpha);
    for (const y of [47, 72]) {
      const [x0, y0] = at(18 - grow, y - grow);
      g.fillRect(x0, y0, across ? 92 + grow * 2 : 9 + grow * 2, across ? 9 + grow * 2 : 92 + grow * 2);
    }
    g.fillTriangle(...at(2 - grow, 64), ...at(20 + grow, 40 - grow), ...at(20 + grow, 88 + grow));
    g.fillTriangle(...at(126 + grow, 64), ...at(108 - grow, 40 - grow), ...at(108 - grow, 88 + grow));
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
      if (special === 'bomb') {
        g.lineStyle(14, 0x06121a, 0.55).strokeCircle(64, 64, 52);
        g.lineStyle(8, 0xffffff, 0.95).strokeCircle(64, 64, 52);
      } else {
        drawLine(g, special === 'row');
      }
      texture.draw(g, 0, 0);
      g.destroy();
    }
  }
  if (!scene.textures.exists('toy_color')) {
    const texture = scene.textures.addDynamicTexture('toy_color', SIZE, SIZE);
    if (!texture) return;
    const g = scene.make.graphics({}, false);
    g.fillStyle(0x06121a, 1).fillCircle(64, 64, 60);
    CHARGE_CATEGORIES.forEach((category, i) => {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(KIND_COLOR[category]).color, 1);
      g.slice(64, 64, 54, Phaser.Math.DegToRad(i * 72 - 90), Phaser.Math.DegToRad((i + 1) * 72 - 90), false);
      g.fillPath();
    });
    g.lineStyle(6, 0xffffff, 1).strokeCircle(64, 64, 55);
    g.fillStyle(0xffffff, 1).fillCircle(64, 64, 15);
    texture.draw(g, 0, 0);
    g.destroy();
  }
}
