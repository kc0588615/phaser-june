# Class: DiscoveryMigrationService

Defined in: [src/services/discoveryMigrationService.ts:4](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/services/discoveryMigrationService.ts#L4)

## Constructors

### Constructor

> **new DiscoveryMigrationService**(): `DiscoveryMigrationService`

#### Returns

`DiscoveryMigrationService`

## Methods

### migrateLocalDiscoveries()

> `static` **migrateLocalDiscoveries**(`userId`): `Promise`\<`void`\>

Defined in: [src/services/discoveryMigrationService.ts:9](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/services/discoveryMigrationService.ts#L9)

Migrate localStorage discoveries to database on first login
Call this after successful authentication

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

***

### needsMigration()

> `static` **needsMigration**(): `boolean`

Defined in: [src/services/discoveryMigrationService.ts:66](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/services/discoveryMigrationService.ts#L66)

Check if migration is needed (has local data + not yet migrated)

#### Returns

`boolean`
