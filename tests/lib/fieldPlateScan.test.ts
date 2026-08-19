import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { inflateSync } from 'node:zlib';
import {
  encodeFieldPlateScan,
  FIELD_PLATE_SCAN_BYTES,
  FIELD_PLATE_SIZE,
  FIELD_PLATE_SLICE_PIXELS,
} from '@/lib/fieldPlateScan.server';
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';

const SEED_A = 'a'.repeat(64);
const SEED_B = 'b'.repeat(64);

describe('field plate scan encoder', () => {
  test('is deterministic for one seed and selected-family set', () => {
    const first = encodeFieldPlateScan(SEED_A, ['body', 'place']);
    const second = encodeFieldPlateScan(SEED_A, ['body', 'place']);
    assert.deepEqual(first, second);
    assert.notDeepEqual(first, encodeFieldPlateScan(SEED_B, ['body', 'place']));
  });

  test('keeps blank through three-signal scans valid, fixed-size 64x64 PNGs', () => {
    const progress: EvidenceFamily[][] = [
      [],
      ['relatives'],
      ['relatives', 'behavior'],
      ['relatives', 'behavior', 'place'],
    ];
    progress.forEach((families, familyCount) => {
      const png = encodeFieldPlateScan(SEED_A, families);
      assert.equal(png.byteLength, FIELD_PLATE_SCAN_BYTES);
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), FIELD_PLATE_SIZE);
      assert.equal(png.readUInt32BE(20), FIELD_PLATE_SIZE);
      assert.equal(countVisiblePixels(png), familyCount * FIELD_PLATE_SLICE_PIXELS);
    });
  });

  test('any three disjoint family slices reveal exactly 960 pixels', () => {
    const sets: EvidenceFamily[][] = [
      ['relatives', 'body', 'behavior'],
      ['body', 'habits', 'place'],
      ['relatives', 'habits', 'place'],
    ];
    for (const families of sets) {
      assert.equal(countVisiblePixels(encodeFieldPlateScan(SEED_A, families)), 960);
    }
    assert.equal(960 / (FIELD_PLATE_SIZE * FIELD_PLATE_SIZE), 0.234375);
  });

  test('rejects malformed seeds, duplicates, and more than three families', () => {
    assert.throws(() => encodeFieldPlateScan('answer-512', []));
    assert.throws(() => encodeFieldPlateScan(SEED_A, ['body', 'body']));
    assert.throws(() => encodeFieldPlateScan(SEED_A, ['relatives', 'body', 'behavior', 'habits']));
  });
});

function countVisiblePixels(png: Buffer): number {
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const rows = inflateSync(Buffer.concat(idat));
  let visible = 0;
  const stride = FIELD_PLATE_SIZE * 4 + 1;
  for (let row = 0; row < FIELD_PLATE_SIZE; row += 1) {
    assert.equal(rows[row * stride], 0);
    for (let column = 0; column < FIELD_PLATE_SIZE; column += 1) {
      if (rows[row * stride + 1 + column * 4 + 3] !== 0) visible += 1;
    }
  }
  return visible;
}
