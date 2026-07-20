# Type Alias: FlowStep

> **FlowStep** = \{ `kind`: `"choose_method"`; `nodeIndex`: `number`; \} \| \{ `kind`: `"choose_evidence"`; `nodeIndex`: `number`; \} \| \{ `kind`: `"board"`; `nodeIndex`: `number`; \} \| \{ `kind`: `"interpret"`; `ref`: `string`; \} \| \{ `kind`: `"recover-observation"`; `nodeIndex`: `number`; \} \| \{ `kind`: `"signature-attempt"`; \} \| \{ `kind`: `"guess"`; \}

Defined in: [src/expedition/caseFlow.ts:36](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L36)

## Type Declaration

\{ `kind`: `"choose_method"`; `nodeIndex`: `number`; \}

### kind

> **kind**: `"choose_method"`

### nodeIndex

> **nodeIndex**: `number`

\{ `kind`: `"choose_evidence"`; `nodeIndex`: `number`; \}

### kind

> **kind**: `"choose_evidence"`

### nodeIndex

> **nodeIndex**: `number`

\{ `kind`: `"board"`; `nodeIndex`: `number`; \}

### kind

> **kind**: `"board"`

### nodeIndex

> **nodeIndex**: `number`

\{ `kind`: `"interpret"`; `ref`: `string`; \}

### kind

> **kind**: `"interpret"`

### ref

> **ref**: `string`

\{ `kind`: `"recover-observation"`; `nodeIndex`: `number`; \}

### kind

> **kind**: `"recover-observation"`

### nodeIndex

> **nodeIndex**: `number`

Node succeeded but its observation was never issued (crash after /complete).

\{ `kind`: `"signature-attempt"`; \}

### kind

> **kind**: `"signature-attempt"`

Try POST /observations for node index 3 exactly once; unavailable settles it.

\{ `kind`: `"guess"`; \}

### kind

> **kind**: `"guess"`
