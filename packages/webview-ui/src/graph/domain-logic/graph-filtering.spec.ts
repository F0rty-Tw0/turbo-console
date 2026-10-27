import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphFocus, GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { SAVED_FLAT_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

type DrawnSide = {
  readonly side: GraphPackageSide;
};

type FilteringRig = PackageSideDepsMock & DrawnSide;

const WEB_FOCUS: GraphFocus = { kind: 'package', name: 'web' };

/** `SAVED_FLAT_STUB` with `web` focused. */
const SAVED_WEB_FOCUS: GraphViewState = { ...SAVED_FLAT_STUB, focus: WEB_FOCUS };

/** A `GraphPackageSide` over the mocked deps with h1 drawn from `saved`: `web` (in `apps`) > `ui` > `core`. */
const drawnRigOf = async (saved: GraphViewState): Promise<FilteringRig> => {
  const mock = packageSideDepsMock();
  const tasks = { onShowTasks: vi.fn(), hasTasks: (): boolean => false };
  const modes = new ViewStateModes(mock.saver, saved);
  const frames = new GraphFrames(mock.deps.now);
  const hooks = { frames, modes, tasks, onMessage: mock.onMessage, onPlaced: mock.onPlaced };
  const side = new GraphPackageSide(mock.deps, mock.view, hooks);
  const rig: FilteringRig = { ...mock, side };
  const settled = (resolve: () => void): void => void setTimeout(resolve, 0);

  side.show(STATE_STUB, 1);
  await new Promise<void>(settled);

  return rig;
};

/** Selects `name` and clicks its details panel Focus, the list's Focus toggle twin. */
const toggleFocus = (rig: FilteringRig, name: string): void => {
  rig.side.filtering.inspection.select(name);
  rig.packageViews.at(-1)?.focus.click();
};

describe('FEATURE: GraphFiltering focus target', () => {
  let rig: FilteringRig;

  beforeEach(() => {
    stubPackageSideGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a saved view focused on web', () => {
    it('WHEN h1 is drawn THEN web is the focus target', async () => {
      rig = await drawnRigOf(SAVED_WEB_FOCUS);

      expect(rig.view.setFocusTarget).toHaveBeenLastCalledWith('web');
    });
  });

  describe('GIVEN h1 drawn with no focus', () => {
    beforeEach(async () => {
      rig = await drawnRigOf(SAVED_FLAT_STUB);
      rig.view.setVisible.mockClear();
      rig.view.setFocusTarget.mockClear();
    });

    it('WHEN web is focused, which hides core, THEN the new visible set is shown and web is the focus target', () => {
      toggleFocus(rig, 'web');

      expect(rig.view.setVisible).toHaveBeenCalledOnce();
      expect(rig.view.setFocusTarget).toHaveBeenLastCalledWith('web');
    });

    it('WHEN ui is focused, whose depth-1 set is every package, THEN no new set is shown and ui is still the focus target', () => {
      toggleFocus(rig, 'ui');

      expect(rig.view.setVisible).not.toHaveBeenCalled();
      expect(rig.view.setFocusTarget).toHaveBeenLastCalledWith('ui');
    });

    it('WHEN web is focused and its focus cleared THEN no package is the focus target', () => {
      toggleFocus(rig, 'web');
      toggleFocus(rig, 'web');

      expect(rig.view.setFocusTarget).toHaveBeenLastCalledWith(null);
    });

    it('WHEN web is focused and then the folder apps THEN no package is the focus target', () => {
      toggleFocus(rig, 'web');
      rig.side.filtering.inspection.folderActions().focusFolder('apps');

      expect(rig.view.setFocusTarget).toHaveBeenLastCalledWith(null);
    });
  });
});
