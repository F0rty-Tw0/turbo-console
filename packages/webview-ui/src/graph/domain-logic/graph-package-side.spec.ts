import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphPackage, GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import { LAYOUT_FAILED_TEXT } from '../common/graph.const.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { SAVED_FLAT_STUB, SAVED_GROUPED_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { isGroupedGraph } from '../test/utils/graph-layouts.spec.util.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

type PackageSideParts = {
  readonly side: GraphPackageSide;
  readonly modes: ViewStateModes;
  readonly hasTasks: Mock<(name: string) => boolean>;
};

type PackageSideRig = PackageSideDepsMock & PackageSideParts;

/** `h1` with no layout cached, so showing it starts a run. */
const UNCACHED: GraphReady = { ...STATE_STUB, positions: null };

const ERROR: GraphState = { kind: 'error', message: 'turbo failed' };

const countOf = (pkg: GraphPackage): GraphPackage => {
  const counted: GraphPackage = { ...pkg, taskCount: pkg.taskCount + 3 };

  return counted;
};

const PACKAGES: GraphPackage[] = STATE_STUB.packages.map(countOf);

/** `h1` again, every package with three tasks more. */
const RECOUNTED: GraphReady = { ...STATE_STUB, packages: PACKAGES };

/** A `GraphPackageSide` over the mocked deps, its view modes starting at `saved`, in a project with no task until `hasTasks` says so. */
const rigOf = (saved: GraphViewState | null): PackageSideRig => {
  const mock = packageSideDepsMock();
  const hasTasks = vi.fn<(name: string) => boolean>(() => false);
  const tasks = { onShowTasks: vi.fn(), hasTasks };
  const modes = new ViewStateModes(mock.saver, saved);
  const frames = new GraphFrames(mock.deps.now);
  const hooks = { frames, modes, tasks, onMessage: mock.onMessage };
  const side = new GraphPackageSide(mock.deps, mock.view, hooks);
  const rig: PackageSideRig = { ...mock, side, modes, hasTasks };

  return rig;
};

const settled = async (): Promise<void> => {
  const wait = (resolve: () => void): void => {
    setTimeout(resolve, 0);
  };

  return new Promise(wait);
};

describe('FEATURE: GraphPackageSide', () => {
  let rig: PackageSideRig;

  beforeEach(() => {
    stubPackageSideGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN no view saved', () => {
    beforeEach(() => {
      rig = rigOf(null);
    });

    it('WHEN a graph state with no layout cached arrives THEN its layout runs and its hash is the one drawn', () => {
      rig.side.show(UNCACHED, 1);

      expect(rig.runs.count()).toBe(1);
      expect(rig.side.drawnHash()).toBe('h1');
    });

    describe('WHEN an error state follows a graph', () => {
      beforeEach(() => {
        rig.side.show(UNCACHED, 1);
        rig.side.show(ERROR, 2);
      });

      it('THEN the message shows and the toolbar hides', () => {
        expect(rig.page.message.hidden).toBe(false);
        expect(rig.page.toolbar.hidden).toBe(true);
      });

      it('THEN no graph is drawn', () => {
        expect(rig.side.drawnHash()).toBeNull();
      });

      it('THEN task mode hears the page shows a message', () => {
        expect(rig.onMessage).toHaveBeenCalledOnce();
      });
    });

    it('WHEN a graph state arrives THEN task mode hears of no message', () => {
      rig.side.show(UNCACHED, 1);

      expect(rig.onMessage).not.toHaveBeenCalled();
    });

    it('WHEN a step of the drawn graph throws THEN the failure shows and task mode hears the page shows a message', async () => {
      rig.side.show(UNCACHED, 1);
      await rig.side.guard((): never => {
        throw new Error('boom');
      });

      expect(rig.page.messageText.textContent).toContain(LAYOUT_FAILED_TEXT);
      expect(rig.onMessage).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN h1 drawn with web selected and no task in web', () => {
    beforeEach(async () => {
      rig = rigOf(SAVED_FLAT_STUB);
      rig.side.show(STATE_STUB, 1);
      await settled();
      rig.side.filtering.inspection.select('web');
    });

    it('WHEN nothing else happens THEN the details panel offers no Show tasks', () => {
      expect(rig.packageViews.at(-1)?.showTasks.hidden).toBe(true);
    });

    it('WHEN h1 arrives again with web given its first tasks THEN the details panel offers Show tasks', () => {
      rig.hasTasks.mockReturnValue(true);
      rig.side.show(RECOUNTED, 2);

      expect(rig.packageViews.at(-1)?.showTasks.hidden).toBe(false);
    });
  });

  it('GIVEN the view modes hold a grouped view the host never saved WHEN h1 arrives THEN the grouped layout runs', () => {
    rig = rigOf(SAVED_GROUPED_STUB);
    rig.side.show(STATE_STUB, 1);

    expect(isGroupedGraph(rig.runs.graphOf(0))).toBe(true);
  });
});

describe('FEATURE: GraphPackageSide parked by task mode', () => {
  let rig: PackageSideRig;

  beforeEach(async () => {
    stubPackageSideGlobals();
    rig = rigOf(SAVED_FLAT_STUB);
    rig.side.show(STATE_STUB, 1);
    await settled();
    rig.side.filtering.inspection.select('web');
    rig.modes.setMode('tasks', 'h1');
    rig.view.resize.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN h1 drawn with web selected, then task mode on', () => {
    it('WHEN nothing is clicked THEN h1 drew with no failure', () => {
      expect(rig.page.messageText.textContent).toBe('');
      expect(rig.onMessage).not.toHaveBeenCalled();
    });

    it('WHEN h1 arrives again with new task counts THEN the status line and Clear selection stay as task mode left them', () => {
      rig.page.status.textContent = '';
      rig.page.clear.disabled = true;
      rig.side.show(RECOUNTED, 2);

      expect(rig.page.status.textContent).toBe('');
      expect(rig.page.clear.disabled).toBe(true);
    });

    it('WHEN task mode is left and h1 drawn again THEN the status line names web again', async () => {
      rig.page.status.textContent = '';
      rig.modes.setMode('packages', 'h1');
      rig.side.redraw();
      await settled();

      expect(rig.page.status.textContent).toMatch(/^web · /u);
    });

    it('WHEN Clear selection is clicked THEN web stays selected', () => {
      rig.page.clear.click();

      expect(rig.side.filtering.inspection.selected()).toBe('web');
    });

    it('WHEN Controls is clicked THEN the package Controls neither re-measure the canvas nor save', () => {
      const before = rig.modes.current();

      rig.page.controls.click();

      expect(rig.view.resize).not.toHaveBeenCalled();
      expect(rig.modes.current()).toBe(before);
    });

    it('WHEN Details is clicked THEN the package Details panel neither re-measures the canvas nor saves', () => {
      const before = rig.modes.current();

      rig.page.details.click();

      expect(rig.view.resize).not.toHaveBeenCalled();
      expect(rig.modes.current()).toBe(before);
    });
  });
});
