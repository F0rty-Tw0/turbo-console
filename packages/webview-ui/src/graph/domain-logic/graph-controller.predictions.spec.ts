import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { SINGLE_TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

const RUNS = { '//#build': 'passed' };

const MIXED = { 'web#build': 'cached', 'web#lint': 'bogus' };

describe('FEATURE: createGraphController predictions', () => {
  let mock: PackageSideDepsMock;

  beforeEach(() => {
    stubPackageSideGlobals();
    mock = packageSideDepsMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN a state was received', () => {
    it.each([
      ['a record', MIXED, { 'web#build': 'cached' }],
      ['a non-object', 5, {}],
      ['no field', undefined, {}]
    ])('WHEN a runs message arrives with %s THEN the canvas gets only its known words', (_name, predictions, expected) => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
      controller.receive({ type: 'runs', runs: RUNS, predictions });

      expect(mock.view.tasks.predictions).toHaveBeenLastCalledWith(expected);
    });

    it('WHEN a runs message arrives with a non-object predictions THEN its runs are still applied', () => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
      controller.receive({ type: 'runs', runs: RUNS, predictions: 5 });

      expect(mock.view.tasks.runStates).toHaveBeenLastCalledWith(RUNS);
    });
  });
});
