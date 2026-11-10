import { describe, expect, it } from 'vitest';

import { predictionTasksOf } from './prediction-tasks.util.ts';
import { dryStateOf } from '../test/utils/atom-load.spec.util.ts';
import { uncachedStateOf } from '../test/utils/prediction-model.spec.util.ts';

const REQUESTED = new Map([
  ['@fx/a#build', '@fx/a'],
  ['@fx/a#lint', '@fx/a'],
  ['@fx/b#build', '@fx/b']
]);

describe('FEATURE: predictionTasksOf', () => {
  describe('GIVEN requested states', () => {
    it('WHEN HIT, MISS and deferred states of requested ids arrive THEN each is kept under its package with its word', () => {
      const states = [dryStateOf('@fx/a#build', 'HIT'), dryStateOf('@fx/a#lint', 'deferred'), dryStateOf('@fx/b#build', 'MISS')];

      expect(predictionTasksOf(states, REQUESTED)).toStrictEqual(
        new Map([
          [
            '@fx/a',
            new Map([
              ['@fx/a#build', 'HIT'],
              ['@fx/a#lint', 'deferred']
            ])
          ],
          ['@fx/b', new Map([['@fx/b#build', 'MISS']])]
        ])
      );
    });
  });

  describe('GIVEN states to drop', () => {
    it('WHEN a requested state has definition.cache false THEN it is dropped', () => {
      const states = [uncachedStateOf('@fx/a#build'), dryStateOf('@fx/a#lint', 'HIT')];

      expect(predictionTasksOf(states, REQUESTED).get('@fx/a')).toStrictEqual(new Map([['@fx/a#lint', 'HIT']]));
    });

    it('WHEN a state id is not requested (a dependency task, or a name requested only in another package) THEN it is dropped', () => {
      const states = [dryStateOf('@fx/c#build', 'HIT'), dryStateOf('@fx/b#lint', 'HIT')];

      expect(predictionTasksOf(states, REQUESTED).size).toBe(0);
    });

    it('WHEN every row of a package is dropped THEN the package has no key', () => {
      const states = [uncachedStateOf('@fx/a#build'), dryStateOf('@fx/b#build', 'HIT')];

      const result = predictionTasksOf(states, REQUESTED);
      const keys = Array.from(result.keys());

      expect(keys).toStrictEqual(['@fx/b']);
    });

    it('WHEN no states arrive THEN the result is empty', () => {
      expect(predictionTasksOf([], REQUESTED).size).toBe(0);
    });
  });
});
