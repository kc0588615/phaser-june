/** Deterministic 32-bit hash for deriving named pseudo-random streams. */
export function hash32(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** Small deterministic PRNG. The returned values are in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

/** Creates an independent deterministic stream without sharing mutable state. */
export function createSeededStream(caseSeed: string, streamName: string): () => number {
  return mulberry32(hash32(`${streamName.length}:${streamName}\u0000${caseSeed}`));
}
