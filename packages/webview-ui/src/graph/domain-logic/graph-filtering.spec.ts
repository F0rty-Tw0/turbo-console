import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphFrames } from './graph-frames.ts';
import { GraphPackageSide } from './graph-package-side.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphEdge, GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { GraphFocus, GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { BundleDetails } from '../common/details-view.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { GROUPED_POSITIONS_STUB, SAVED_FLAT_STUB, SAVED_GROUPED_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { settled, stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';
import { bundle, folderInspection, link, pkg } from '../test/utils/inspections.spec.util.ts';
import { showLabelOf } from '../utils/controls-text.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

type DrawnSide = {
  readonly side: GraphPackageSide;
};

type FilteringRig = PackageSideDepsMock & DrawnSide;

const WEB_FOCUS: GraphFocus = { kind: 'package', name: 'web' };

/** `SAVED_FLAT_STUB` with `web` focused. */
const SAVED_WEB_FOCUS: GraphViewState = { ...SAVED_FLAT_STUB, focus: WEB_FOCUS };

/** `STATE_STUB` with the grouped layout cached, so a grouped view draws at once. */
const GROUPED_STATE: GraphReady = { ...STATE_STUB, folderPositions: GROUPED_POSITIONS_STUB };

/** A `GraphPackageSide` over the mocked deps with h1 drawn from `saved`: `web` (in `apps`) > `ui` > `core`. */
const drawnRigOf = async (saved: GraphViewState, state: GraphReady = STATE_STUB): Promise<FilteringRig> => {
  const mock = packageSideDepsMock();
  const tasks = { onShowTasks: vi.fn(), hasTasks: (): boolean => false };
  const modes = new ViewStateModes(mock.saver, saved);
  const frames = new GraphFrames(mock.deps.now);
  const hooks = { frames, modes, tasks, onMessage: mock.onMessage, onPlaced: mock.onPlaced, onLocation: mock.onLocation };
  const side = new GraphPackageSide(mock.deps, mock.view, hooks);
  const rig: FilteringRig = { ...mock, side };

  side.show(state, 1);
  await settled();

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

describe('FEATURE: GraphFiltering location updates', () => {
  let rig: FilteringRig;

  beforeEach(() => {
    stubPackageSideGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN h1 drawn', () => {
    beforeEach(async () => {
      rig = await drawnRigOf(SAVED_FLAT_STUB);
      rig.onLocation.mockClear();
    });

    it('WHEN grouping turns off THEN the location bar reads the cleared focus once', () => {
      rig.side.filtering.groupingOff();

      expect(rig.onLocation).toHaveBeenCalledOnce();
    });

    it('WHEN the folder scene is redrawn THEN the location bar reads again', () => {
      rig.side.filtering.folders.redraw();

      expect(rig.onLocation).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN h1 drawn grouped with the packages folder excluded', () => {
    beforeEach(async () => {
      rig = await drawnRigOf(SAVED_GROUPED_STUB, GROUPED_STATE);
      rig.side.filtering.controls.excludeFolder('packages');
      rig.view.setVisible.mockClear();
      rig.onLocation.mockClear();
    });

    describe('WHEN the folder apps is focused, which keeps the shown set', () => {
      beforeEach(() => {
        rig.side.filtering.inspection.folderActions().focusFolder('apps');
      });

      it('THEN the shown set is not redrawn', () => {
        expect(rig.view.setVisible).not.toHaveBeenCalled();
      });

      it('THEN the apps row Focus folder reads pressed', () => {
        const button = rig.page.widgets.querySelector('[aria-label="Focus folder apps"]');

        expect(button?.getAttribute('aria-pressed')).toBe('true');
      });
    });
  });
});

/** `SAVED_GROUPED_STUB` with the packages folder collapsed, so the one folder link is `web` to the collapsed packages. */
const SAVED_COLLAPSED: GraphViewState = { ...SAVED_GROUPED_STUB, collapsed: ['packages'] };

/** `GROUPED_STATE`'s edges with `web` also depending on `core`, so the folder link web to the collapsed packages bundles two links. */
const TWO_LINK_EDGES: GraphEdge[] = [...GROUPED_STATE.edges, { source: 'web', target: 'core' }];

const TWO_LINK_STATE: GraphReady = { ...GROUPED_STATE, edges: TWO_LINK_EDGES };

/** Unticks the list checkbox of `name`, as a click on its row does. */
const untick = (rig: FilteringRig, name: string): void => {
  const check = rig.page.body.querySelector<HTMLInputElement>(`[aria-label="${showLabelOf(name)}"]`);

  if (check === null) throw new Error(`no checkbox for ${name}`);

  check.checked = false;
  check.dispatchEvent(new Event('input'));
};

const lastBundleOf = (rig: FilteringRig): BundleDetails => {
  const view = rig.bundleViews.at(-1);

  if (view === undefined) throw new Error('no bundle view was built');

  return view;
};

const firstRowOf = (rig: FilteringRig): BundleDetails['links'][number] => {
  const [row] = lastBundleOf(rig).links;

  if (row === undefined) throw new Error('the bundle view lists no row');

  return row;
};

describe('FEATURE: GraphFiltering bundle inspection', () => {
  let rig: FilteringRig;

  beforeEach(async () => {
    stubPackageSideGlobals();
    rig = await drawnRigOf(SAVED_COLLAPSED, GROUPED_STATE);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the packages folder collapsed with the link web to it tapped', () => {
    beforeEach(() => {
      rig.side.filtering.inspection.input({ kind: 'tapBundle', source: 'web', target: collapsedIdOf('packages') });
    });

    it('THEN the bundle is the inspection', () => {
      expect(rig.side.filtering.inspection.current()).toStrictEqual(bundle('web', collapsedIdOf('packages')));
    });

    it('THEN the packages folder is still collapsed', () => {
      const live = rig.side.filtering.folders.collapsed();
      const collapsed = [...live];

      expect(collapsed).toContain('packages');
    });

    it('THEN one bundle view is built, listing the package link web to ui and its count', () => {
      const view = lastBundleOf(rig);
      const rows = view.links.map(({ source, target }) => [source, target]);

      expect(rig.bundleViews).toHaveLength(1);
      expect(rows).toStrictEqual([['web', 'ui']]);
      expect(view.count.textContent).toBe('1 link');
    });

    it('THEN the Details bar and the status read the bundle summary', () => {
      expect(rig.page.detailsSummary.textContent).toBe('1 link: web → packages');
      expect(rig.page.status.textContent).toBe('1 link: web → packages');
    });

    it('WHEN the same bundle is tapped again THEN the view is updated in place, not built again', () => {
      rig.side.filtering.inspection.input({ kind: 'tapBundle', source: 'web', target: collapsedIdOf('packages') });

      expect(rig.bundleViews).toHaveLength(1);
    });

    it('WHEN a row button has focus and a recheck keeps the rows THEN the focus stays on it and the view is not rebuilt', () => {
      const { explain } = firstRowOf(rig);

      explain.focus();
      rig.side.filtering.inspection.recheck(rig.side.filtering.controls.visible());

      expect(document.activeElement).toBe(explain);
      expect(rig.bundleViews).toHaveLength(1);
    });

    it('WHEN the folder end is clicked THEN the packages folder is inspected and stays collapsed', () => {
      lastBundleOf(rig).target.click();

      const live = rig.side.filtering.folders.collapsed();

      expect(rig.side.filtering.inspection.current()).toStrictEqual(folderInspection('packages'));
      expect([...live]).toContain('packages');
    });

    it('WHEN the package end is clicked THEN web is selected', () => {
      lastBundleOf(rig).source.click();

      expect(rig.side.filtering.inspection.current()).toStrictEqual(pkg('web'));
    });

    it('WHEN Explain of the row is clicked THEN the link is explained and the packages folder is expanded', () => {
      firstRowOf(rig).explain.click();

      const live = rig.side.filtering.folders.collapsed();

      expect(rig.side.filtering.inspection.current()).toStrictEqual(link('web', 'ui'));
      expect([...live]).not.toContain('packages');
    });

    it('WHEN the target name of the row is clicked THEN ui is selected and the packages folder is expanded', () => {
      firstRowOf(rig).pickTarget.click();

      const live = rig.side.filtering.folders.collapsed();

      expect(rig.side.filtering.inspection.current()).toStrictEqual(pkg('ui'));
      expect([...live]).not.toContain('packages');
    });

    it('WHEN the source name of the row is clicked THEN that row source is selected', () => {
      const row = firstRowOf(rig);

      row.pickSource.click();

      expect(rig.side.filtering.inspection.current()).toStrictEqual(pkg(row.source));
    });

    it('THEN the saved view state holds no inspection', () => {
      expect(rig.saver.schedule).toHaveBeenLastCalledWith(
        expect.objectContaining({ selected: null, link: null, trace: null, folder: null })
      );
    });

    it('WHEN the packages folder is expanded THEN no inspection is left', () => {
      rig.side.filtering.folders.expand(['packages']);

      expect(rig.side.filtering.inspection.current()).toStrictEqual(NO_INSPECTION);
    });

    it('WHEN grouping turns off THEN no inspection is left', () => {
      rig.side.filtering.groupingOff();

      expect(rig.side.filtering.inspection.current()).toStrictEqual(NO_INSPECTION);
    });

    it('WHEN the apps folder is excluded, which hides web, THEN no inspection is left', () => {
      rig.side.filtering.controls.excludeFolder('apps');

      expect(rig.side.filtering.inspection.current()).toStrictEqual(NO_INSPECTION);
    });
  });

  describe('GIVEN a bundle of two links web to the collapsed packages, inspected', () => {
    beforeEach(async () => {
      rig = await drawnRigOf(SAVED_COLLAPSED, TWO_LINK_STATE);
      rig.side.filtering.inspection.input({ kind: 'tapBundle', source: 'web', target: collapsedIdOf('packages') });
    });

    it('WHEN core is hidden, which leaves the folder link with one link, THEN the view is built again with one row', () => {
      untick(rig, 'core');

      const view = lastBundleOf(rig);

      expect(rig.bundleViews).toHaveLength(2);
      expect(view.links).toHaveLength(1);
      expect(view.count.textContent).toBe('1 link');
    });
  });

  describe('GIVEN a bundle between ends the scene draws no folder link for', () => {
    it('WHEN web to ui, which is drawn as web to the collapsed packages, is tapped THEN the Empty view is shown, not a bundle', () => {
      const empty = vi.spyOn(rig.deps.views, 'empty');

      rig.side.filtering.inspection.input({ kind: 'tapBundle', source: 'web', target: 'ui' });

      expect(rig.bundleViews).toHaveLength(0);
      expect(empty).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN the apps folder inspected', () => {
    it('WHEN grouping turns off THEN no inspection is left', () => {
      rig.side.filtering.inspection.input({ kind: 'selectFolder', folder: 'apps' });
      rig.side.filtering.groupingOff();

      expect(rig.side.filtering.inspection.current()).toStrictEqual(NO_INSPECTION);
    });
  });
});
