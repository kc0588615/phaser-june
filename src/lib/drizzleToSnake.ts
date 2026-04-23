/** Convert a Drizzle result row (camelCase keys) to snake_case for API responses. */
export function drizzleToSnake(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const snakeKey = key
      .replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)
      .replace(/([a-z])(\d)/g, '$1_$2');
    out[snakeKey] = value;
  }
  return out;
}
