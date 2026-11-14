import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import type { GraphController } from '../common/graph-page.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { SINGLE_TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

const RUNS = { 'web#build': 'running' };

const PASSED = { 'web#build': 'passed' };

const ELAPSED = { 'web#build': 64_000 };

describe('FEATURE: createGraphController card clock', () => {
  let mock: PackageSideDepsMock;
  let t: number;
  let controller: GraphController;

  beforeEach(() => {
    stubPackageSideGlobals();
    mock = packageSideDepsMock();
    t = 1000;
    controller = createGraphController({ ...mock.deps, now: (): number => t });
    controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN a state was received', () => {
    it('WHEN a runs message carries elapsed THEN the canvas gets that text', () => {
      controller.receive({ type: 'runs', runs: RUNS, elapsed: ELAPSED });

      expect(mock.view.tasks.clocks).toHaveBeenLastCalledWith({ 'web#build': '1m 4s' });
    });

    it('WHEN runs arrives THEN setInterval is called once with 1000', () => {
      controller.receive({ type: 'runs', runs: RUNS, elapsed: ELAPSED });

      expect(vi.mocked(mock.deps.clockPorts.setInterval)).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 1000);
    });

    it('WHEN a later runs message has no elapsed THEN the canvas gets {} and the interval is cleared', () => {
      controller.receive({ type: 'runs', runs: RUNS, elapsed: ELAPSED });
      controller.receive({ type: 'runs', runs: PASSED });

      expect(mock.view.tasks.clocks).toHaveBeenLastCalledWith({});
      expect(vi.mocked(mock.deps.clockPorts.clearInterval)).toHaveBeenCalledOnce();
    });

    it('GIVEN a live clock and 5 minutes of page time WHEN clockShown is called THEN the canvas gets 6m 4s', () => {
      controller.receive({ type: 'runs', runs: RUNS, elapsed: ELAPSED });
      t = 301_000;
      controller.clockShown();

      expect(mock.view.tasks.clocks).toHaveBeenLastCalledWith({ 'web#build': '6m 4s' });
    });
  });
});
