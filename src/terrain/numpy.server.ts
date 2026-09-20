/** Only the two deployed TiTiler NumPy v1 formats are supported. No eval. */
export function decodeTerrainNumpy(bytes: Uint8Array, format: 'raw' | 'rgba'): number[] {
  if (bytes.byteLength < 10 || bytes.byteLength > 65536
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
  if (fields.descr.slice(1, -1) !== (format === 'raw' ? '<u2' : '|u1') || fields.fortran_order !== 'False'
    || fields.shape.replace(/\s/g, '') !== `(${bands},6,6)` || bytes.length !== offset + bands * 36 * wordBytes) {
    throw new Error('Unexpected terrain NumPy dtype, shape, order or byte length');
  }
  return Array.from({ length: bands * 36 }, (_, i) => wordBytes === 2 ? view.getUint16(offset + i * 2, true) : view.getUint8(offset + i));
}
