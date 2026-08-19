# Interface: FamilyMapping

Defined in: [src/config/familyCommonNames.ts:15](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/config/familyCommonNames.ts#L15)

Family Common Names Configuration

This file serves as the single source of truth for mapping scientific family names
to their common (vernacular) names. This mapping is used throughout the application
to display user-friendly family names alongside scientific names.

Format: Scientific Family Name → Common Name

## Example

```ts
getFamilyCommonName('Testudinidae') // returns 'tortoises'
getFamilyDisplayName('Testudinidae') // returns 'Testudinidae (tortoises)'
```

## Properties

### commonName

> **commonName**: `string`

Defined in: [src/config/familyCommonNames.ts:17](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/config/familyCommonNames.ts#L17)

***

### description?

> `optional` **description**: `string`

Defined in: [src/config/familyCommonNames.ts:18](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/config/familyCommonNames.ts#L18)

***

### scientificName

> **scientificName**: `string`

Defined in: [src/config/familyCommonNames.ts:16](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/config/familyCommonNames.ts#L16)
