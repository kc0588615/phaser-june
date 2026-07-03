# Function: useCesiumTrail()

> **useCesiumTrail**(`viewerRef`): `object`

Defined in: [src/hooks/useCesiumTrail.ts:171](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/hooks/useCesiumTrail.ts#L171)

Manages expedition trail polyline + node markers on the Cesium globe.
 Keeps 3D mode during runs and animates camera along the route.

## Parameters

### viewerRef

`MutableRefObject`\<`any`\>

## Returns

`object`

### loadSpatialLayers()

> **loadSpatialLayers**: (`lon`, `lat`, `route?`) => `Promise`\<`void`\>

#### Parameters

##### lon

`number`

##### lat

`number`

##### route?

[`RoutePoint`](../../../lib/expeditionRoute/interfaces/RoutePoint.md)[]

#### Returns

`Promise`\<`void`\>

### spatialLayersRef

> **spatialLayersRef**: `MutableRefObject`\<`GeoJsonDataSource`[]\>
