// Characterization tests for the gem registry and board spawn configuration.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOOT_GEM_TYPES,
  GEM_TYPES,
  GEM_REGISTRY,
  createBoardSpawnConfig,
  buildBoardSpawnConfigForNode,
  getRunNodeLabel,
  getGemFamily,
  isLootGem,
} from '@/expedition/domain';
import { AFFINITY_DEFINITIONS } from '@/expedition/affinities';

describe('gem registry', () => {
  test('every gem type has a definition with a consistent family', () => {
    assert.equal(GEM_TYPES.length, LOOT_GEM_TYPES.length);
    for (const gemType of GEM_TYPES) {
      const def = GEM_REGISTRY[gemType];
      assert.ok(def, `missing definition for ${gemType}`);
      assert.equal(def.gemType, gemType);
      assert.equal(def.family, 'loot');
      assert.equal(def.family, getGemFamily(gemType));
      assert.ok(isLootGem(gemType));
    }
    assert.deepEqual(GEM_TYPES, LOOT_GEM_TYPES);
  });

  test('all 8 registered gems map to distinct clue categories', () => {
    const categories = LOOT_GEM_TYPES.map((gemType) => GEM_REGISTRY[gemType].clueCategory);
    assert.ok(categories.every((category) => category !== null));
    assert.equal(new Set(categories).size, LOOT_GEM_TYPES.length);
  });

});

describe('createBoardSpawnConfig', () => {
  test('defaults to an empty gem-weight override', () => {
    const config = createBoardSpawnConfig();
    assert.deepEqual(config, { lootWeights: {} });
  });

  test('preserves explicit gem weights', () => {
    assert.deepEqual(createBoardSpawnConfig({ lootWeights: { red: 3 } }), { lootWeights: { red: 3 } });
  });
});

describe('buildBoardSpawnConfigForNode', () => {
  test('forwards gem weights without node-type action boosts', () => {
    const config = buildBoardSpawnConfigForNode('riverbank_sweep', { orange: 3 });
    assert.deepEqual(config, { lootWeights: { orange: 3 } });
  });

  test('unknown node types fall back to the custom meta', () => {
    const config = buildBoardSpawnConfigForNode('never_heard_of_it');
    assert.deepEqual(config, { lootWeights: {} });
  });
});

describe('getRunNodeLabel', () => {
  test('waypoint-aware labels for custom nodes', () => {
    const label = (waypointType: string, fallback = false) =>
      getRunNodeLabel({ node_type: 'custom', waypoint: { waypointType, fallback } });
    assert.equal(label('protected_area'), 'Protected');
    assert.equal(label('bioregion_edge'), 'Ecotone');
    assert.equal(label('basecamp', true), 'Basecamp');
    assert.equal(label('basecamp', false), 'Urban');
    assert.equal(label('lake'), 'Water');
    assert.equal(label('wetland'), 'Water');
  });

  test('falls back to the static table, then to a prettified node_type', () => {
    assert.equal(getRunNodeLabel({ node_type: 'riverbank_sweep' }), 'River');
    assert.equal(getRunNodeLabel({ node_type: 'mystery_marsh' }), 'mystery marsh');
  });
});

describe('affinities', () => {
  test('affinities remain score/content labels without board-gem effects', () => {
    for (const [affinity, def] of Object.entries(AFFINITY_DEFINITIONS)) {
      assert.ok(def.label.length > 0, affinity);
      assert.match(def.color, /^#[0-9a-f]{6}$/i);
      assert.equal('buffedGem' in def, false);
    }
  });
});
