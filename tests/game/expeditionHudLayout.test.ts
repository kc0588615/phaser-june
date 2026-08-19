import assert from 'node:assert/strict';
import test from 'node:test';
import { getExpeditionBoardSafeArea } from '@/game/expeditionHudLayout';

test('expedition board safe area follows responsive HUD rails', () => {
  assert.deepEqual(getExpeditionBoardSafeArea(390), {
    left: 0, right: 120, top: 12, bottom: 106, dualRail: false,
  });
  assert.deepEqual(getExpeditionBoardSafeArea(639), {
    left: 0, right: 120, top: 12, bottom: 106, dualRail: false,
  });
  assert.deepEqual(getExpeditionBoardSafeArea(640), {
    left: 0, right: 152, top: 12, bottom: 76, dualRail: false,
  });
  assert.deepEqual(getExpeditionBoardSafeArea(1023), {
    left: 0, right: 152, top: 12, bottom: 76, dualRail: false,
  });
  assert.deepEqual(getExpeditionBoardSafeArea(1024), {
    left: 152, right: 152, top: 12, bottom: 12, dualRail: true,
  });
});
