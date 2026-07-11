// Characterization tests for the gem registry and board spawn configuration.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_GEM_TYPES,
  LOOT_GEM_TYPES,
  METHOD_TYPES,
  METHOD_GEM_MAP,
  GEM_METHOD_MAP,
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

  test('investigation methods map bijectively onto five frozen loot gem ids', () => {
    assert.equal(new Set(Object.values(METHOD_GEM_MAP)).size, METHOD_TYPES.length);
    for (const method of METHOD_TYPES) {
      const gemType = METHOD_GEM_MAP[method];
      assert.ok(LOOT_GEM_TYPES.includes(gemType));
      assert.equal(GEM_METHOD_MAP[gemType], method);
    }
    for (const disabledGem of ['black', 'white', 'purple'] as const) {
      assert.equal(GEM_METHOD_MAP[disabledGem], undefined);
      assert.equal(ACTIVE_GEM_TYPES.includes(disabledGem), false);
    }
  });
});

describe('createBoardSpawnConfig', () => {
  test('defaults to an empty method-weight override', () => {
    const config = createBoardSpawnConfig();
    assert.deepEqual(config, { lootWeights: {} });
  });

  test('preserves explicit method weights', () => {
    assert.deepEqual(createBoardSpawnConfig({ lootWeights: { red: 3 } }), { lootWeights: { red: 3 } });
  });
});

describe('buildBoardSpawnConfigForNode', () => {
  test('forwards method weights without node-type action boosts', () => {
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
