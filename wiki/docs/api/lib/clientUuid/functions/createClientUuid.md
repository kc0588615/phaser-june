# Function: createClientUuid()

> **createClientUuid**(`cryptoApi`): `string`

Defined in: [lib/clientUuid.ts:4](https://github.com/kc0588615/phaser-june/blob/main/src/lib/clientUuid.ts#L4)

Creates a UUID on HTTP origins where crypto.randomUUID is unavailable.

## Parameters

### cryptoApi

`BrowserCrypto` = `globalThis.crypto`

## Returns

`string`
