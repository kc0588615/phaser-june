# Type Alias: RoutingCommand

> **RoutingCommand** = \{ `kind`: `"move"`; `requestId`: `string`; `revision`: `number`; `submission`: [`EvidenceMoveSubmission`](../../../lib/evidenceMoveVerification/interfaces/EvidenceMoveSubmission.md); \} \| \{ `cellId`: `string` \| `null`; `kind`: `"extend"`; `requestId`: `string`; `revision`: `number`; \} \| \{ `cellId`: `string`; `kind`: `"travel"`; `requestId`: `string`; `revision`: `number`; \}

Defined in: [phaser-june-039/src/terrain/routingSession.ts:20](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/routingSession.ts#L20)
