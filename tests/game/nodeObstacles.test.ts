// Characterization tests for seeded node obstacles (deterministic board hazards).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNodeObstacleSeeds,
  buildNodeBoardContext,
  getObstacleFamily,
  formatNodeObstacleLabel,
  isStaticSeededObstacle,
} from '@/game/nodeObstacles';

const BASE = { width: 6, height: 6, obstacles: ['mud_tiles', 'overgrowth'] as any, nodeIndex: 1 };

describe('buildNodeObstacleSeeds', () => {
  test('is deterministic for the same config', () => {
    assert.deepEqual(buildNodeObstacleSeeds(BASE), buildNodeObstacleSeeds(BASE));
  });

  test('different nodeIndex produces a different layout', () => {
    const a = buildNodeObstacleSeeds(BASE);
    const b = buildNodeObstacleSeeds({ ...BASE, nodeIndex: 2 });
    assert.notDeepEqual(a, b);
  });

  test('honors per-obstacle footprint counts and cell state', () => {
    const seeds = buildNodeObstacleSeeds(BASE);
    const mud = seeds.filter((seed) => seed.state.flags?.includes('mud_tiles'));
    const vines = seeds.filter((seed) => seed.state.flags?.includes('overgrowth'));
    assert.equal(mud.length, 4);
    assert.equal(vines.length, 3);
    for (const seed of mud) {
      assert.equal(seed.state.blockerId, 'mud');
      assert.equal(seed.state.durability, 2);
    }
    // No two seeds share a cell.
    const coords = new Set(seeds.map((seed) => `${seed.x},${seed.y}`));
    assert.equal(coords.size, seeds.length);
  });

  test('junk blockers only spawn in the top rows', () => {
    const seeds = buildNodeObstacleSeeds({ width: 6, height: 6, obstacles: ['junk_blockers'] as any });
    assert.ok(seeds.length > 0);
    for (const seed of seeds) assert.ok(seed.y < 2, `junk at y=${seed.y}`);
  });
});

describe('buildNodeBoardContext', () => {
  test('splits static (seeded) from dynamic obstacles', () => {
    const ctx = buildNodeBoardContext({
      width: 6,
      height: 6,
      obstacles: ['mud_tiles', 'time_pressure'] as any,
      nodeIndex: 0,
    });
    assert.deepEqual(ctx.staticObstacles, ['mud_tiles']);
    assert.deepEqual(ctx.dynamicObstacles, ['time_pressure']);
    assert.equal(typeof ctx.seed, 'number');
    assert.ok(ctx.obstacleSeeds.length > 0);
  });
});

describe('obstacle metadata', () => {
  test('obstacle -> family and labels', () => {
    assert.equal(getObstacleFamily('mud_tiles'), 'terrain');
    assert.equal(getObstacleFamily('time_pressure'), 'alert');
    assert.equal(formatNodeObstacleLabel('flow_shift'), 'Flow Shift');
    assert.equal(isStaticSeededObstacle('mud_tiles'), true);
    assert.equal(isStaticSeededObstacle('time_pressure'), false);
  });
});
