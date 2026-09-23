# Type Alias: RoutingCommand

> **RoutingCommand** = \{ `kind`: `"move"`; `requestId`: `string`; `revision`: `number`; `submission`: [`EvidenceMoveSubmission`](../../../lib/evidenceMoveVerification/interfaces/EvidenceMoveSubmission.md); \} \| \{ `cellId`: `string` \| `null`; `kind`: `"extend"`; `requestId`: `string`; `revision`: `number`; \} \| \{ `cellId`: `string`; `kind`: `"travel"`; `requestId`: `string`; `revision`: `number`; \}

Defined in: [terrain/routingSession.ts:20](https://github.com/kc0588615/phaser-june/blob/main/src/terrain/routingSession.ts#L20)
