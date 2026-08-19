# Variable: speciesService

> `const` **speciesService**: `object`

Defined in: [src/lib/speciesService.ts:127](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/speciesService.ts#L127)

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

### getFallbackNames()

> **getFallbackNames**(): `string`[]

#### Returns

`string`[]

### getRandomSpeciesNames()

> **getRandomSpeciesNames**(`count`, `excludeId?`): `Promise`\<`string`[]\>

Get random species names for the guessing game

#### Parameters

##### count

`number` = `15`

##### excludeId?

`number`

#### Returns

`Promise`\<`string`[]\>

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

### getSpeciesAtPoint()

> **getSpeciesAtPoint**(`longitude`, `latitude`): `Promise`\<[`SpeciesQueryResult`](../interfaces/SpeciesQueryResult.md)\>

Query species that intersect with a given point

#### Parameters

##### longitude

`number`

##### latitude

`number`

#### Returns

`Promise`\<[`SpeciesQueryResult`](../interfaces/SpeciesQueryResult.md)\>

### getSpeciesBioregions()

> **getSpeciesBioregions**(`speciesIds`): `Promise`\<`object`[]\>

Get bioregion data for multiple species

#### Parameters

##### speciesIds

`number`[]

#### Returns

`Promise`\<`object`[]\>

### getSpeciesByIds()

> **getSpeciesByIds**(`ids`): `Promise`\<[`Species`](../../../types/database/interfaces/Species.md)[]\>

Get species by their species.id values

#### Parameters

##### ids

`number`[]

#### Returns

`Promise`\<[`Species`](../../../types/database/interfaces/Species.md)[]\>

### getSpeciesGeoJSON()

> **getSpeciesGeoJSON**(`speciesIds`): `Promise`\<`any`\>

Return species polygons as GeoJSON for map rendering.

#### Parameters

##### speciesIds

`number`[]

#### Returns

`Promise`\<`any`\>

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
