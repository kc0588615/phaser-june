# Variable: speciesService

> `const` **speciesService**: `object`

Defined in: [lib/speciesService.ts:84](https://github.com/kc0588615/phaser-june/blob/main/src/lib/speciesService.ts#L84)

## Type Declaration

### getClosestHabitat()

> **getClosestHabitat**(`longitude`, `latitude`, `signal?`): `Promise`\<`any`\>

Get the closest habitat polygon when no species are found at a point
Uses PostGIS nearest-neighbor search with no distance limit

#### Parameters

##### longitude

`number`

##### latitude

`number`

##### signal?

`AbortSignal`

#### Returns

`Promise`\<`any`\>

### getRasterHabitatDistribution()

> **getRasterHabitatDistribution**(`longitude`, `latitude`, `signal?`): `Promise`\<[`RasterHabitatResult`](../interfaces/RasterHabitatResult.md)[]\>

Get habitat distribution within 10km of a point using TiTiler statistics on COG

#### Parameters

##### longitude

`number`

##### latitude

`number`

##### signal?

`AbortSignal`

#### Returns

`Promise`\<[`RasterHabitatResult`](../interfaces/RasterHabitatResult.md)[]\>

### getSpeciesInRadius()

> **getSpeciesInRadius**(`longitude`, `latitude`, `radiusMeters`, `signal?`): `Promise`\<[`SpeciesQueryResult`](../interfaces/SpeciesQueryResult.md)\>

Query species within a radius of a given point

#### Parameters

##### longitude

`number`

##### latitude

`number`

##### radiusMeters

`number`

##### signal?

`AbortSignal`

#### Returns

`Promise`\<[`SpeciesQueryResult`](../interfaces/SpeciesQueryResult.md)\>
