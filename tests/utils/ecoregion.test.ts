import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSpeciesByTaxonomy } from '@/utils/ecoregion';
import type { Species } from '@/types/database';

describe('taxonomy grouping', () => {
  test('groups class, order, family, and genus before sorting species', () => {
    const species: Species[] = [
      {
        id: 2,
        common_name: 'Lion',
        class: 'Mammalia',
        taxon_order: 'Carnivora',
        family: 'Felidae',
        genus: 'Panthera',
      },
      {
        id: 1,
        common_name: 'Jaguar',
        class: 'Mammalia',
        taxon_order: 'Carnivora',
        family: 'Felidae',
        genus: 'Panthera',
      },
      {
        id: 3,
        common_name: 'Cheetah',
        class: 'Mammalia',
        taxon_order: 'Carnivora',
        family: 'Felidae',
        genus: 'Acinonyx',
      },
      {
        id: 4,
        common_name: 'Another lion',
        class: 'MAMMALIA',
        taxon_order: 'CARNIVORA',
        family: 'FELIDAE',
        genus: 'PANTHERA',
      },
    ];

    const grouped = groupSpeciesByTaxonomy(species);

    assert.deepEqual(Object.keys(grouped.Mammalia.Carnivora.Felidae), ['Panthera', 'Acinonyx']);
    assert.deepEqual(
      grouped.Mammalia.Carnivora.Felidae.Panthera.map(item => item.common_name),
      ['Another lion', 'Jaguar', 'Lion'],
    );
  });

  test('keeps missing ranks in an explicit unknown branch', () => {
    const grouped = groupSpeciesByTaxonomy([{ id: 5, common_name: 'Mystery species' }]);

    assert.equal(grouped.Unknown.Unknown.Unknown.Unknown[0].id, 5);
  });
});
