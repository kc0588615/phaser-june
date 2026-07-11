import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnswerPrior, scoreSpeciesForAnchor } from '@/lib/answerPrior';

describe('answerPrior', () => {
  test('GIS context boosts plausible candidates without excluding any candidate', () => {
    const prior = buildAnswerPrior([
      { speciesId: 2, freshwater: false, habitatDescription: 'arid desert' },
      { speciesId: 1, freshwater: true, habitatDescription: 'river and wetland' },
    ], [{ waypointType: 'river' }]);

    assert.ok(prior.get(1)! > prior.get(2)!);
    assert.ok(prior.get(2)! > 0);
    assert.deepEqual([...prior.keys()], [1, 2]);
  });

  test('protected-area weighting uses conservation context', () => {
    assert.equal(
      scoreSpeciesForAnchor(
        { speciesId: 1, conservationCode: 'CR', conservationText: 'Critically Endangered' },
        { waypointType: 'protected_area' },
      ),
      6,
    );
  });

  test('no anchors produces equal positive priors', () => {
    assert.deepEqual(
      [...buildAnswerPrior([{ speciesId: 3 }, { speciesId: 1 }], [])],
      [[1, 1], [3, 1]],
    );
  });
});
