# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `_debug?`: \{ `enabled_layers`: `string`[]; `layer_decay`: \{\[`k`: `string`\]: `number`; \}; `layer_scores`: `object`[]; \}; `bioregion`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `realm`: `string` \| `null`; \} \| `null`; `feature_fingerprints`: [`FeatureFingerprint`](../../../../../../types/gis/interfaces/FeatureFingerprint.md)[]; `generated_nodes`: [`RunNode`](../../../../../../lib/nodeScoring/interfaces/RunNode.md)[]; `habitat_mix`: `RasterHabitatResult`[]; `mission_seed`: `number`; `modifier_nodes`: `string`[]; `nearest_river_dist_m`: `number` \| `null`; `primary_node_family`: [`NodeFamily`](../../../../../../lib/nodeScoring/type-aliases/NodeFamily.md); `primary_variant`: `string`; `protected_areas`: `object`[]; `query`: \{ `bbox`: \{ `east`: `number`; `north`: `number`; `south`: `number`; `west`: `number`; \}; `lat`: `number`; `lon`: `number`; `square_size_m`: `number`; \}; `signals`: \{ `forest_ratio`: `number`; `protected_coverage_ratio`: `number`; `threatened_species_count`: `number`; `urban_ratio`: `number`; `water_ratio`: `number`; \}; `threatened_species`: `object`[]; \}\>\>

Defined in: [src/app/api/protected-areas/at-point/route.ts:190](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/protected-areas/at-point/route.ts#L190)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `_debug?`: \{ `enabled_layers`: `string`[]; `layer_decay`: \{\[`k`: `string`\]: `number`; \}; `layer_scores`: `object`[]; \}; `bioregion`: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `realm`: `string` \| `null`; \} \| `null`; `feature_fingerprints`: [`FeatureFingerprint`](../../../../../../types/gis/interfaces/FeatureFingerprint.md)[]; `generated_nodes`: [`RunNode`](../../../../../../lib/nodeScoring/interfaces/RunNode.md)[]; `habitat_mix`: `RasterHabitatResult`[]; `mission_seed`: `number`; `modifier_nodes`: `string`[]; `nearest_river_dist_m`: `number` \| `null`; `primary_node_family`: [`NodeFamily`](../../../../../../lib/nodeScoring/type-aliases/NodeFamily.md); `primary_variant`: `string`; `protected_areas`: `object`[]; `query`: \{ `bbox`: \{ `east`: `number`; `north`: `number`; `south`: `number`; `west`: `number`; \}; `lat`: `number`; `lon`: `number`; `square_size_m`: `number`; \}; `signals`: \{ `forest_ratio`: `number`; `protected_coverage_ratio`: `number`; `threatened_species_count`: `number`; `urban_ratio`: `number`; `water_ratio`: `number`; \}; `threatened_species`: `object`[]; \}\>\>
