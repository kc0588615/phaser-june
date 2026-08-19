import { createHmac } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { EVIDENCE_FAMILIES, isEvidenceFamily, type EvidenceFamily } from '@/expedition/evidenceFamilies';

export const FIELD_PLATE_SIZE = 64;
export const FIELD_PLATE_SLICE_PIXELS = 320;
export const FIELD_PLATE_SCAN_BYTES = 16_516;

const PIXEL_COUNT = FIELD_PLATE_SIZE * FIELD_PLATE_SIZE;
const STREAM = 'field-plate-scan-v0';
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const FAMILY_COLORS: Record<EvidenceFamily, readonly [number, number, number, number]> = {
  relatives: [248, 113, 113, 255],
  body: [251, 146, 60, 255],
  behavior: [250, 204, 21, 255],
  habits: [74, 222, 128, 255],
  place: [56, 189, 248, 255],
};

/** Species-blind scan: the only inputs are the persisted case seed and earned signal families. */
export function encodeFieldPlateScan(caseSeed: string, selectedFamilies: readonly EvidenceFamily[]): Buffer {
  if (!/^[a-f0-9]{64}$/iu.test(caseSeed)) throw new Error('Invalid field-plate case seed');
  if (selectedFamilies.length > 3 || new Set(selectedFamilies).size !== selectedFamilies.length
    || selectedFamilies.some(family => !isEvidenceFamily(family))) {
    throw new Error('Invalid field-plate evidence families');
  }

  const coordinates = shuffledCoordinates(caseSeed);
  const pixels = Buffer.alloc(PIXEL_COUNT * 4);
  const selected = new Set(selectedFamilies);
  EVIDENCE_FAMILIES.forEach((family, familyIndex) => {
    if (!selected.has(family)) return;
    const color = FAMILY_COLORS[family];
    const start = familyIndex * FIELD_PLATE_SLICE_PIXELS;
    for (let index = start; index < start + FIELD_PLATE_SLICE_PIXELS; index += 1) {
      const offset = coordinates[index] * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  });

  const scanlines = Buffer.alloc((FIELD_PLATE_SIZE * 4 + 1) * FIELD_PLATE_SIZE);
  for (let row = 0; row < FIELD_PLATE_SIZE; row += 1) {
    const target = row * (FIELD_PLATE_SIZE * 4 + 1);
    scanlines[target] = 0;
    pixels.copy(scanlines, target + 1, row * FIELD_PLATE_SIZE * 4, (row + 1) * FIELD_PLATE_SIZE * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(FIELD_PLATE_SIZE, 0);
  ihdr.writeUInt32BE(FIELD_PLATE_SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines, { level: 0 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  if (png.byteLength !== FIELD_PLATE_SCAN_BYTES) throw new Error(`Unexpected field-plate scan size: ${png.byteLength}`);
  return png;
}

function shuffledCoordinates(caseSeed: string): number[] {
  const values = Array.from({ length: PIXEL_COUNT }, (_, index) => index);
  const key = Buffer.from(caseSeed, 'hex');
  let block: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let blockOffset = 0;
  let counter = 0;
  const nextUInt32 = () => {
    if (blockOffset + 4 > block.length) {
      block = createHmac('sha256', key).update(STREAM).update(String(counter)).digest();
      blockOffset = 0;
      counter += 1;
    }
    const value = block.readUInt32BE(blockOffset);
    blockOffset += 4;
    return value;
  };
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = nextUInt32() % (index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function pngChunk(type: 'IHDR' | 'IDAT' | 'IEND', data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function crc32(value: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
