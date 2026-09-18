import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createClientUuid } from '@/lib/clientUuid';

describe('createClientUuid', () => {
  test('uses randomUUID when available', () => {
    const expected = '550e8400-e29b-41d4-a716-446655440000' as const;
    const cryptoApi = {
      randomUUID: () => expected,
      getRandomValues: <T extends ArrayBufferView | null>(value: T) => value,
    };
    assert.equal(createClientUuid(cryptoApi), expected);
  });

  test('creates a v4 UUID when randomUUID is unavailable', () => {
    const cryptoApi = {
      getRandomValues: <T extends ArrayBufferView | null>(value: T): T => {
        if (value instanceof Uint8Array) value.fill(0xab);
        return value;
      },
    };
    const uuid = createClientUuid(cryptoApi);
    assert.equal(uuid, 'abababab-abab-4bab-abab-abababababab');
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  });
});
