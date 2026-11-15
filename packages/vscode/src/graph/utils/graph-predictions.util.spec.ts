import type { GraphTask } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { predictionsOf } from './graph-predictions.util.ts';
import type { PredictionLookup } from '../../tree/common/prediction.type.ts';
import { GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { predictionViewOf } from '../test/utils/prediction-view.spec.util.ts';

const protoNamed = (task: GraphTask): GraphTask => {
  const renamed: GraphTask = { ...task, id: '__proto__' };

  return renamed;
};

describe('FEATURE: predictions of the listed tasks', () => {
  describe('GIVEN answers for two of three packages', () => {
    it('WHEN predictionsOf runs THEN each answered task gets its wire word', () => {
      const lookup = predictionViewOf({
        a: [['a#build', 'HIT']],
        web: [
          ['web#build', 'deferred'],
          ['web#lint', 'MISS']
        ]
      });

      expect(predictionsOf('/ws', GRAPH_TASKS_STUB, lookup)).toStrictEqual({
        'a#build': 'cached',
        'web#build': 'unknown',
        'web#lint': 'notCached'
      });
    });
  });

  describe('GIVEN no package answered', () => {
    it('WHEN predictionsOf runs THEN the record is empty', () => {
      expect(predictionsOf('/ws', GRAPH_TASKS_STUB, () => null)).toStrictEqual({});
    });
  });

  describe('GIVEN a view id that is not among the tasks', () => {
    it('WHEN predictionsOf runs THEN it is left out', () => {
      expect(predictionsOf('/ws', GRAPH_TASKS_STUB, predictionViewOf({ a: [['a#gone', 'HIT']] }))).toStrictEqual({});
    });
  });

  describe('GIVEN a listed task of package a whose id is __proto__ and an answer for it', () => {
    it('WHEN predictionsOf runs THEN the word is an own key of the record', () => {
      const tasks = GRAPH_TASKS_STUB.filter((task) => task.id === 'a#build').map(protoNamed);
      const predictions = predictionsOf('/ws', tasks, predictionViewOf({ a: [['__proto__', 'HIT']] }));

      expect(Object.hasOwn(predictions, '__proto__')).toBe(true);
    });
  });

  it('WHEN predictionsOf runs THEN the view is read once per package with the given root', () => {
    const lookup = vi.fn<PredictionLookup>().mockReturnValue(null);

    predictionsOf('/ws', GRAPH_TASKS_STUB, lookup);

    expect(lookup.mock.calls).toStrictEqual([
      ['/ws', '@org/x'],
      ['/ws', 'a'],
      ['/ws', 'web']
    ]);
  });
});
