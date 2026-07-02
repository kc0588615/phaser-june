// Guards the matchBattle JSON blob accepted on POST/PATCH /api/runs* before it lands in `metadata` jsonb.
// Caps size, blocks prototype-pollution keys, and rejects non-plain-object roots so a hostile or buggy
// client can't bloat storage or corrupt the resume path.

const MAX_BLOB_BYTES = 100_000; // 100 KB; legitimate matchBattle states are <10 KB.
const MAX_DEPTH = 12;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function walk(value: unknown, depth: number): boolean {
  if (depth > MAX_DEPTH) return false;
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) {
    for (const item of value) if (!walk(item, depth + 1)) return false;
    return true;
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) return false;
      if (!walk(value[key], depth + 1)) return false;
    }
    return true;
  }
  return false; // functions, symbols, class instances, etc.
}

export function sanitizeMatchBattleBlob(value: unknown): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null;
  if (!walk(value, 0)) return null;
  let serialized: string;
  try { serialized = JSON.stringify(value); } catch { return null; }
  if (serialized.length > MAX_BLOB_BYTES) return null;
  return value;
}
