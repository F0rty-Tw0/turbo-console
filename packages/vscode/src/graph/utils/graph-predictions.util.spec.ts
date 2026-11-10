import { describe, expect, it, vi } from 'vitest';

import { predictionsOf } from './graph-predictions.util.ts';
import type { PredictionLookup } from '../../tree/common/prediction.type.ts';
import { GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { predictionViewOf } from '../test/utils/prediction-view.spec.util.ts';

describe('FEATURE: predictions of the listed tasks', () => {
  it('GIVEN answers for two of three packages WHEN predictionsOf runs THEN each answered task gets its wire word', () => {
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

  it('GIVEN no package answered WHEN predictionsOf runs THEN the record is empty', () => {
    expect(predictionsOf('/ws', GRAPH_TASKS_STUB, () => null)).toStrictEqual({});
  });

  it('GIVEN a view id that is not among the tasks WHEN predictionsOf runs THEN it is left out', () => {
    expect(predictionsOf('/ws', GRAPH_TASKS_STUB, predictionViewOf({ a: [['a#gone', 'HIT']] }))).toStrictEqual({});
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
