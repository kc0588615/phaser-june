# Variable: speciesService

> `const` **speciesService**: `object`

Defined in: [src/lib/speciesService.ts:127](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/lib/speciesService.ts#L127)

## Type Declaration

### getClosestHabitat()

> **getClosestHabitat**(`longitude`, `latitude`): `Promise`\<`any`\>

Get the closest habitat polygon when no species are found at a point
Uses PostGIS nearest-neighbor search with no distance limit

#### Parameters

##### longitude

`number`

##### latitude

`number`

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

> **getRasterHabitatDistribution**(`longitude`, `latitude`): `Promise`\<[`RasterHabitatResult`](../interfaces/RasterHabitatResult.md)[]\>

Get habitat distribution within 10km of a point using TiTiler statistics on COG

#### Parameters

##### longitude

`number`

##### latitude

`number`

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

Get species by their ogc_fid values

#### Parameters

##### ids

`number`[]

#### Returns

`Promise`\<[`Species`](../../../types/database/interfaces/Species.md)[]\>

### getSpeciesGeoJSON()

> **getSpeciesGeoJSON**(`speciesIds`): `Promise`\<`any`\>

Render species polygons on Cesium (returns GeoJSON)

#### Parameters

##### speciesIds

`number`[]

#### Returns

`Promise`\<`any`\>

### getSpeciesInRadius()

> **getSpeciesInRadius**(`longitude`, `latitude`, `radiusMeters`): `Promise`\<[`SpeciesQueryResult`](../interfaces/SpeciesQueryResult.md)\>

Query species within a radius of a given point

#### Parameters

##### longitude

`number`

##### latitude

`number`

##### radiusMeters

`number`

#### Returns

`Promise`\<[`SpeciesQueryResult`](../interfaces/SpeciesQueryResult.md)\>
