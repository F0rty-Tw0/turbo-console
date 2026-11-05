import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { GROUPED_POSITIONS_STUB, SAVED_FLAT_STUB, SAVED_GROUPED_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { WEB_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';
import { settled, stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';
import { mapOf } from '../test/utils/run-marks.spec.util.ts';

type RunsSideParts = {
  readonly side: GraphPackageSide;
  readonly modes: ViewStateModes;
};

type RunsSideRig = PackageSideDepsMock & RunsSideParts;

const WEB_TEST_STUB: GraphTask = { ...WEB_BUILD_STUB, id: 'web#test', name: 'test', dependencies: [] };

/** `h1` listing `web#build`. */
const BUILD_LISTED: GraphReady = { ...STATE_STUB, tasks: [WEB_BUILD_STUB] };

/** `h1` listing `web#build`, the grouped layout cached. */
const GROUPED_LISTED: GraphReady = { ...BUILD_LISTED, folderPositions: GROUPED_POSITIONS_STUB };

/** `h1` again, now also listing `web#test`. */
const TEST_ADDED: GraphReady = { ...STATE_STUB, tasks: [WEB_BUILD_STUB, WEB_TEST_STUB] };

/** A `GraphPackageSide` over the mocked deps, its view modes starting at `saved`. */
const rigOf = (saved: GraphViewState): RunsSideRig => {
  const mock = packageSideDepsMock();
  const tasks = { onShowTasks: vi.fn(), hasTasks: (): boolean => false };
  const modes = new ViewStateModes(mock.saver, saved);
  const frames = new GraphFrames(mock.deps.now);
  const hooks = { frames, modes, tasks, onMessage: mock.onMessage, onPlaced: mock.onPlaced, onLocation: mock.onLocation };
  const side = new GraphPackageSide(mock.deps, mock.view, hooks);
  const rig: RunsSideRig = { ...mock, side, modes };

  return rig;
};

describe('FEATURE: GraphPackageSide run states', () => {
  let rig: RunsSideRig;

  beforeEach(() => {
    stubPackageSideGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the package side showing a graph whose tasks list web#build', () => {
    beforeEach(async () => {
      rig = rigOf(SAVED_FLAT_STUB);
      rig.side.show(BUILD_LISTED, 1);
      await settled();
      rig.view.setPackageRuns.mockClear();
    });

    it('WHEN runs say web#build running in package mode THEN the screen view gets setPackageRuns web running', () => {
      rig.side.runs({ 'web#build': 'running' });

      expect(rig.view.setPackageRuns).toHaveBeenLastCalledWith(mapOf('running'));
    });

    it('WHEN runs arrive while task mode owns the canvas THEN the screen view gets no setPackageRuns', () => {
      rig.modes.setMode('tasks', 'h1');
      rig.side.runs({ 'web#build': 'running' });

      expect(rig.view.setPackageRuns).not.toHaveBeenCalled();
    });

    it('WHEN task mode is left and the package graph is drawn again THEN setPackageRuns gets web running', async () => {
      rig.side.runs({ 'web#build': 'running' });
      rig.modes.setMode('tasks', 'h1');
      rig.modes.setMode('packages', 'h1');
      rig.view.setPackageRuns.mockClear();
      rig.side.redraw();
      await settled();

      expect(rig.view.setPackageRuns).toHaveBeenLastCalledWith(mapOf('running'));
    });

    it('WHEN the same hash is shown again with web#test added and web#test failed THEN setPackageRuns gets web failed', () => {
      rig.side.runs({ 'web#test': 'failed' });
      rig.side.show(TEST_ADDED, 2);

      expect(rig.view.setPackageRuns).toHaveBeenLastCalledWith(mapOf('failed'));
    });
  });

  describe('GIVEN runs that say web#build running before the graph shows', () => {
    it('WHEN the layouts place the graph THEN setPackageRuns is called after the folder pass with the latest runs', async () => {
      rig = rigOf(SAVED_GROUPED_STUB);
      rig.side.runs({ 'web#build': 'running' });
      rig.side.show(GROUPED_LISTED, 1);
      await settled();

      const { showFolders, setPackageRuns } = rig.view;
      const folderPass = showFolders.mock.invocationCallOrder.at(-1) ?? 0;
      const marked = setPackageRuns.mock.invocationCallOrder.at(-1) ?? 0;

      expect(showFolders).toHaveBeenCalled();
      expect(setPackageRuns).toHaveBeenLastCalledWith(mapOf('running'));
      expect(marked).toBeGreaterThan(folderPass);
    });
  });

  describe('GIVEN a flat graph drawn with the grouped layout cached and web#build running', () => {
    it('WHEN the grouping switches THEN setPackageRuns gets web running after the new placement', async () => {
      rig = rigOf(SAVED_FLAT_STUB);
      rig.side.show(GROUPED_LISTED, 1);
      await settled();
      rig.side.runs({ 'web#build': 'running' });
      rig.view.setPackageRuns.mockClear();
      await rig.side.layouts.switchTo('folders');

      expect(rig.view.setPackageRuns).toHaveBeenLastCalledWith(mapOf('running'));
    });
  });
});
