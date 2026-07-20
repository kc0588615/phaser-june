# Type Alias: MethodChoiceDecision

> **MethodChoiceDecision** = \{ `kind`: `"commit"`; `method`: [`MethodType`](../../../expedition/domain/type-aliases/MethodType.md); `offered`: \[[`MethodType`](../../../expedition/domain/type-aliases/MethodType.md), [`MethodType`](../../../expedition/domain/type-aliases/MethodType.md)\]; \} \| \{ `kind`: `"idempotent"`; `method`: [`MethodType`](../../../expedition/domain/type-aliases/MethodType.md); `offered`: \[[`MethodType`](../../../expedition/domain/type-aliases/MethodType.md), [`MethodType`](../../../expedition/domain/type-aliases/MethodType.md)\]; \} \| \{ `kind`: `"reject"`; `reason`: `"invalid_method"` \| `"not_active"` \| `"not_offered"` \| `"method_reused"` \| `"choice_locked"` \| `"invalid_offer_path"`; \}

Defined in: [src/lib/runCaseState.ts:503](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runCaseState.ts#L503)
