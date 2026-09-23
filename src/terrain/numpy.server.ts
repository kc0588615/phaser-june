/** Only the two deployed TiTiler NumPy v1 formats are supported. No eval. */
export const TERRAIN_RESPONSE_LIMIT = 262144;

export function decodeTerrainNumpy(bytes: Uint8Array, format: 'raw' | 'rgba', size = 6): number[] {
  if (bytes.byteLength < 10 || bytes.byteLength > TERRAIN_RESPONSE_LIMIT
    || ![147, 78, 85, 77, 80, 89, 1, 0].every((byte, i) => bytes[i] === byte)) {
    throw new Error('Unsupported terrain NumPy format');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLength = view.getUint16(8, true);
  const offset = 10 + headerLength;
  if (offset > bytes.length || offset % 16 !== 0) throw new Error('Invalid terrain NumPy header length');
  const header = new TextDecoder('ascii', { fatal: true }).decode(bytes.subarray(10, offset));
  // Accept the verified Python literal dictionary, regardless of key order.
  const entries = [...header.matchAll(/['"](descr|fortran_order|shape)['"]\s*:\s*('[^']*'|"[^"]*"|False|True|\([^)]*\))\s*,?/g)];
  const remainder = header.replace(/['"](descr|fortran_order|shape)['"]\s*:\s*('[^']*'|"[^"]*"|False|True|\([^)]*\))\s*,?/g, '').trim();
  if (entries.length !== 3 || new Set(entries.map(entry => entry[1])).size !== 3 || !/^\{\s*\}$/.test(remainder) || !header.endsWith('\n')) {
    throw new Error('Malformed terrain NumPy header');
  }
  const fields = Object.fromEntries(entries.map(entry => [entry[1], entry[2]]));
  const bands = format === 'raw' ? 2 : 4;
  const wordBytes = format === 'raw' ? 2 : 1;
  if (!Number.isInteger(size) || size < 1 || size > 96
    || fields.descr.slice(1, -1) !== (format === 'raw' ? '<u2' : '|u1') || fields.fortran_order !== 'False'
    || fields.shape.replace(/\s/g, '') !== `(${bands},${size},${size})` || bytes.length !== offset + bands * size * size * wordBytes) {
    throw new Error('Unexpected terrain NumPy dtype, shape, order or byte length');
  }
  return Array.from({ length: bands * size * size }, (_, i) => wordBytes === 2 ? view.getUint16(offset + i * 2, true) : view.getUint8(offset + i));
}

export function encodeTerrainNumpy(values: readonly number[], format: 'raw' | 'rgba', size = 6): Uint8Array {
  const bands = format === 'raw' ? 2 : 4;
  const wordBytes = format === 'raw' ? 2 : 1;
  if (values.length !== bands * size * size) throw new Error('Unexpected terrain NumPy value count');
  const dict = `{'descr': '${format === 'raw' ? '<u2' : '|u1'}', 'fortran_order': False, 'shape': (${bands}, ${size}, ${size}), }`;
  const unpadded = 10 + dict.length + 1;
  const headerLength = unpadded + (16 - (unpadded % 16)) % 16 - 10;
  const bytes = new Uint8Array(10 + headerLength + values.length * wordBytes);
  bytes.set([147, 78, 85, 77, 80, 89, 1, 0]);
  new DataView(bytes.buffer).setUint16(8, headerLength, true);
  const header = (dict + ' '.repeat(headerLength - dict.length - 1) + '\n');
  bytes.set(new TextEncoder().encode(header), 10);
  const view = new DataView(bytes.buffer);
  values.forEach((value, i) => wordBytes === 2 ? view.setUint16(10 + headerLength + i * 2, value, true) : view.setUint8(10 + headerLength + i, value));
  return bytes;
}
