import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { graphLocationOf } from './graph-location.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import type { GraphLocation, GraphLocationDeps, LocationCrumb, LocationFacts, LocationViews } from '../common/location.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { pageMock } from '../test/mocks/page.mock.ts';

type LocationSpies = {
  readonly render: Mock<LocationViews['render']>;
  readonly clearFocus: Mock<() => void>;
  readonly leave: Mock<() => void>;
  readonly request: Mock<(name: string) => void>;
  readonly locationFacts: Mock<() => LocationFacts>;
};

/** What the bar reads; the rows change it between updates. */
type RigState = {
  readonly mode: GraphViewMode;
  readonly folder: string | null;
  readonly drawn: DrawnGraph;
};

type RigControls = {
  readonly location: GraphLocation;
  readonly setMode: (mode: GraphViewMode) => void;
  readonly setFolder: (folder: string | null) => void;
  readonly setDrawn: (drawn: DrawnGraph) => void;
};

type LocationRig = LocationSpies & RigControls;

const APP_FACTS: LocationFacts = { taskPackage: 'app', taskCount: 3, isSinglePackage: false };

const packageOf = (name: string, path: string): GraphPackage => {
  const info: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return info;
};

const INFOS: GraphPackage[] = [packageOf('core-1', 'core/core-1'), packageOf('a-pkg', 'a/a-pkg')];

const EDGES: GraphEdge[] = [{ source: 'a-pkg', target: 'core-1' }];

/** Folder `core` linked with `a` once. */
const DRAWN: DrawnGraph = { hash: 'h1', packages: ['core-1', 'a-pkg'], infos: INFOS, edges: EDGES };

const BACK_EDGE: GraphEdge = { source: 'core-1', target: 'a-pkg' };

const TWO_LINK_EDGES: GraphEdge[] = [...EDGES, BACK_EDGE];

/** Folder `core` linked with `a` twice: the same crumbs as `DRAWN`, another info line. */
const TWO_LINK_DRAWN: DrawnGraph = { ...DRAWN, edges: TWO_LINK_EDGES };

const spiesOf = (): LocationSpies => {
  const spies: LocationSpies = {
    render: vi.fn<LocationViews['render']>(),
    clearFocus: vi.fn<() => void>(),
    leave: vi.fn<() => void>(),
    request: vi.fn<(name: string) => void>(),
    locationFacts: vi.fn((): LocationFacts => APP_FACTS)
  };

  return spies;
};

/** The bar's deps over the spec's page, `state` and `spies`; `app`'s tasks are the task facts. */
const depsOf = (state: RigState, spies: LocationSpies): GraphLocationDeps => {
  const { render, clearFocus, leave, request, locationFacts } = spies;
  const page = pageMock();
  const locationViews = { render };
  const widgetViews = { location: locationViews };
  const modes = { mode: (): GraphViewMode => state.mode };
  const controls = { focusedFolder: (): string | null => state.folder, clearFocus };
  const filtering = { controls };
  const packages = { filtering, drawnGraph: (): DrawnGraph => state.drawn };
  const tasks = { locationFacts, leave };
  const reveal = { request };
  const deps: GraphLocationDeps = { page, widgetViews, modes, packages, tasks, reveal };

  return deps;
};

/** A bar over spies, built in `mode` with `folder` focused. */
const rigOf = (mode: GraphViewMode, folder: string | null): LocationRig => {
  const state = { mode, folder, drawn: DRAWN };
  const spies = spiesOf();
  const location = graphLocationOf(depsOf(state, spies));
  const setMode = (next: GraphViewMode): void => {
    state.mode = next;
  };
  const setFolder = (next: string | null): void => {
    state.folder = next;
  };
  const setDrawn = (next: DrawnGraph): void => {
    state.drawn = next;
  };
  const rig: LocationRig = { ...spies, location, setMode, setFolder, setDrawn };

  return rig;
};

const labelOf = (crumb: LocationCrumb): string => crumb.label;

/** The labels of the crumbs the bar rendered last. */
const shownLabels = (rig: LocationRig): string[] => {
  const crumbs = rig.render.mock.lastCall?.[1] ?? [];

  return crumbs.map(labelOf);
};

/** Presses the crumb labelled `label` of the last render; throws when the bar never rendered or shows no such crumb. */
const press = (rig: LocationRig, label: string): void => {
  const call = rig.render.mock.lastCall;

  if (call === undefined) throw new Error('The bar never rendered');

  const [, crumbs, , onPress] = call;
  const crumb = crumbs.find((each) => each.label === label);

  if (crumb === undefined) throw new Error(`The bar shows no crumb labelled ${label}`);

  onPress(crumb);
};

describe('FEATURE: graphLocationOf', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN package mode with no folder focused', () => {
    it('WHEN built THEN the bar already shows Packages without reading the task facts', () => {
      const rig = rigOf('packages', null);

      expect(rig.render).toHaveBeenCalledOnce();
      expect(shownLabels(rig)).toStrictEqual(['Packages']);
      expect(rig.locationFacts).not.toHaveBeenCalled();
    });

    it('WHEN updated with nothing changed THEN the bar is not rebuilt', () => {
      const rig = rigOf('packages', null);

      rig.location.update();

      expect(rig.render).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN folder core focused in package mode', () => {
    it('WHEN built THEN the bar shows Packages › core and its info lines', () => {
      const rig = rigOf('packages', 'core');

      expect(shownLabels(rig)).toStrictEqual(['Packages', 'core']);
      expect(rig.render.mock.lastCall?.[2]).toStrictEqual(['1 link with a not shown']);
    });

    it('WHEN Packages is pressed THEN the folder focus clears and task mode is not left', () => {
      const rig = rigOf('packages', 'core');

      press(rig, 'Packages');

      expect(rig.clearFocus).toHaveBeenCalledOnce();
      expect(rig.leave).not.toHaveBeenCalled();
    });

    it('WHEN the folder’s links change under the same crumbs and the bar updates THEN the new info lines are shown', () => {
      const rig = rigOf('packages', 'core');

      rig.setDrawn(TWO_LINK_DRAWN);
      rig.location.update();

      expect(rig.render).toHaveBeenCalledTimes(2);
      expect(rig.render.mock.lastCall?.[2]).toStrictEqual(['2 links with a not shown']);
    });

    it('WHEN grouping turns off, clearing the focus, and the bar updates THEN the folder crumb is gone and Packages remains', () => {
      const rig = rigOf('packages', 'core');

      rig.setFolder(null);
      rig.location.update();

      expect(shownLabels(rig)).toStrictEqual(['Packages']);
      expect(rig.render.mock.lastCall?.[2]).toStrictEqual([]);
    });
  });

  describe('GIVEN task mode on app’s tasks, with a folder focus left from package mode', () => {
    it('WHEN built THEN the bar shows Packages › app › Tasks (3) and no info lines', () => {
      const rig = rigOf('tasks', 'core');

      expect(shownLabels(rig)).toStrictEqual(['Packages', 'app', 'Tasks (3)']);
      expect(rig.render.mock.lastCall?.[2]).toStrictEqual([]);
    });

    it('WHEN Packages is pressed THEN task mode is left and the folder focus is kept', () => {
      const rig = rigOf('tasks', 'core');

      press(rig, 'Packages');

      expect(rig.leave).toHaveBeenCalledOnce();
      expect(rig.clearFocus).not.toHaveBeenCalled();
    });

    it('WHEN the app crumb is pressed THEN app is revealed in the package graph', () => {
      const rig = rigOf('tasks', null);

      press(rig, 'app');

      expect(rig.request).toHaveBeenCalledExactlyOnceWith('app');
    });

    it('WHEN task mode is left and the bar updates THEN it shows Packages › core again', () => {
      const rig = rigOf('tasks', 'core');

      rig.setMode('packages');
      rig.location.update();

      expect(shownLabels(rig)).toStrictEqual(['Packages', 'core']);
    });
  });
});
