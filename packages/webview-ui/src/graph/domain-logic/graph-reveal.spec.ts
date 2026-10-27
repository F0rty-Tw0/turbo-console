import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackageReveal } from './graph-reveal.ts';
import type { GraphPackage, Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { DrawnGraph, Viewport } from '../common/graph-page.type.ts';
import type { RevealDepsMock } from '../test/common/graph-reveal.type.ts';
import { revealDepsMock } from '../test/mocks/graph-reveal.mock.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

const WEB_INFO: GraphPackage = { name: 'web', path: 'apps/web', tags: [], taskCount: 0 };

const API_INFO: GraphPackage = { name: 'api', path: 'libs/api', tags: [], taskCount: 0 };

/** `web` in `apps` and `api` in `libs`, unlinked. */
const GRAPH: DrawnGraph = { hash: 'h1', packages: ['web', 'api'], infos: [WEB_INFO, API_INFO], edges: [] };

/** The next hash, which has `api` only. */
const NO_WEB: DrawnGraph = { hash: 'h2', packages: ['api'], infos: [API_INFO], edges: [] };

const NONE: GraphFilters = { hidden: new Set(), focus: null, depth: 2, tags: new Set() };

const WEB_HIDDEN: GraphFilters = { ...NONE, hidden: new Set(['web']) };

const PAN: Position = { x: 40, y: -20 };

const cameraAt = (zoom: number): Viewport => {
  const camera: Viewport = { zoom, pan: PAN };

  return camera;
};

/** Lets the microtask a `placed()` queued run. */
const flush = async (): Promise<void> => {
  await Promise.resolve();
};

describe('FEATURE: PackageReveal', () => {
  let rig: RevealDepsMock;
  let reveal: PackageReveal;

  beforeEach(() => {
    stubPackageSideGlobals();
    rig = revealDepsMock(GRAPH, NONE);
    reveal = new PackageReveal(rig.deps);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN package mode with the graph placed and no layout in flight', () => {
    it('WHEN web is revealed THEN its filters are edited and it is selected, with no zoom', () => {
      reveal.request('web', 1);

      expect(rig.log).toStrictEqual(['edit', 'select web']);
    });

    it('WHEN web is revealed at zoom 0.5 THEN the camera zooms to 1 at its pan before the select', () => {
      rig.view.viewport.mockReturnValue(cameraAt(0.5));

      reveal.request('web', 1);

      expect(rig.view.setViewport).toHaveBeenCalledWith(1, PAN);
      expect(rig.log).toStrictEqual(['edit', 'setViewport 1', 'select web']);
    });

    it('WHEN web is revealed at zoom 0.75 THEN the camera keeps its zoom', () => {
      rig.view.viewport.mockReturnValue(cameraAt(0.75));

      reveal.request('web', 1);

      expect(rig.view.setViewport).not.toHaveBeenCalled();
    });

    it('WHEN a name the graph lacks is revealed THEN nothing is edited, opened, zoomed or selected', () => {
      rig.view.viewport.mockReturnValue(cameraAt(0.5));

      reveal.request('zzz', 1);

      expect(rig.log).toStrictEqual([]);
    });

    it('WHEN a name the graph lacks is revealed and a layout places later THEN it was dropped', async () => {
      reveal.request('zzz', 1);
      reveal.placed();
      await flush();

      expect(rig.log).toStrictEqual([]);
    });

    it('WHEN a layout places with nothing revealed THEN nothing happens', async () => {
      reveal.placed();
      await flush();

      expect(rig.log).toStrictEqual([]);
    });
  });

  describe('GIVEN task mode on', () => {
    beforeEach(() => {
      rig.tasks.isActive.mockReturnValue(true);
      reveal.request('web', 7);
    });

    it('WHEN web is revealed THEN task mode is left at the message time and nothing is selected yet', () => {
      expect(rig.tasks.toggle).toHaveBeenCalledWith(7);
      expect(rig.log).toStrictEqual(['toggle']);
    });

    it('WHEN the package graph places THEN the filters are edited and web is selected', async () => {
      rig.tasks.isActive.mockReturnValue(false);

      reveal.placed();
      await flush();

      expect(rig.log).toStrictEqual(['toggle', 'edit', 'select web']);
    });
  });

  describe('GIVEN task mode on and the package graph not drawn yet, its state held by the routing', () => {
    beforeEach(() => {
      rig.tasks.isActive.mockReturnValue(true);
      rig.drawn.mockReturnValue(null);
      reveal.request('web', 1);
    });

    it('WHEN web is revealed THEN it is held, not dropped, until the held graph places', async () => {
      rig.tasks.isActive.mockReturnValue(false);
      rig.drawn.mockReturnValue(GRAPH);

      reveal.placed();
      await flush();

      expect(rig.log).toStrictEqual(['toggle', 'edit', 'select web']);
    });
  });

  describe('GIVEN package mode with no package graph drawn yet', () => {
    beforeEach(() => {
      rig.drawn.mockReturnValue(null);
      reveal.request('web', 1);
    });

    it('WHEN web is revealed THEN nothing happens yet', () => {
      expect(rig.log).toStrictEqual([]);
    });

    it('WHEN the first graph places THEN web is selected', async () => {
      rig.drawn.mockReturnValue(GRAPH);

      reveal.placed();
      await flush();

      expect(rig.log).toStrictEqual(['edit', 'select web']);
    });
  });

  describe('GIVEN a layout in flight', () => {
    beforeEach(() => {
      rig.layouts.isPlacing.mockReturnValue(true);
    });

    it('WHEN web is revealed THEN nothing happens yet', () => {
      reveal.request('web', 1);

      expect(rig.log).toStrictEqual([]);
    });

    it('WHEN web is revealed and the layout places, then fits THEN the select lands after the fit', async () => {
      const place = (): void => {
        rig.layouts.isPlacing.mockReturnValue(false);
        reveal.placed();
        rig.log.push('fit');
      };

      reveal.request('web', 1);
      place();
      await flush();

      expect(rig.log).toStrictEqual(['fit', 'edit', 'select web']);
    });

    it('WHEN web is revealed and a new hash without web places THEN it is dropped', async () => {
      reveal.request('web', 1);
      rig.layouts.isPlacing.mockReturnValue(false);
      rig.drawn.mockReturnValue(NO_WEB);

      reveal.placed();
      await flush();

      expect(rig.log).toStrictEqual([]);
    });

    it('WHEN web and then api are revealed and the layout places THEN only api is selected', async () => {
      reveal.request('web', 1);
      reveal.request('api', 2);
      rig.layouts.isPlacing.mockReturnValue(false);

      reveal.placed();
      await flush();

      expect(rig.inspection.select.mock.calls).toStrictEqual([['api']]);
    });
  });

  describe('GIVEN grouped by folder with apps collapsed', () => {
    /** An expand that opens apps and starts a layout, as a grouping change would. */
    const startLayout = (): void => {
      rig.collapsed.delete('apps');
      rig.layouts.isPlacing.mockReturnValue(true);
    };

    beforeEach(() => {
      rig.layouts.mode.mockReturnValue('folders');
      rig.collapsed.add('apps');
    });

    it('WHEN web is revealed THEN apps expands before the select', () => {
      reveal.request('web', 1);

      expect(rig.log).toStrictEqual(['edit', 'expand apps', 'select web']);
    });

    it('WHEN api is revealed THEN apps stays collapsed', () => {
      reveal.request('api', 1);

      expect(rig.folders.expand).not.toHaveBeenCalled();
    });

    it('WHEN the expand starts a layout THEN web is selected once, after that layout places', async () => {
      rig.folders.expand.mockImplementation(startLayout);
      reveal.request('web', 1);
      rig.layouts.isPlacing.mockReturnValue(false);

      reveal.placed();
      await flush();

      expect(rig.inspection.select.mock.calls).toStrictEqual([['web']]);
    });

    it('WHEN the expand starts a layout THEN nothing is selected before it places', () => {
      rig.folders.expand.mockImplementation(startLayout);

      reveal.request('web', 1);

      expect(rig.inspection.select).not.toHaveBeenCalled();
    });
  });

  it('GIVEN flat with apps in the collapsed set WHEN web is revealed THEN no folder expands', () => {
    rig.collapsed.add('apps');

    reveal.request('web', 1);

    expect(rig.folders.expand).not.toHaveBeenCalled();
  });

  describe('GIVEN task mode on, web excluded and apps collapsed while grouped', () => {
    beforeEach(() => {
      rig = revealDepsMock(GRAPH, WEB_HIDDEN);
      reveal = new PackageReveal(rig.deps);
      rig.tasks.isActive.mockReturnValue(true);
      rig.layouts.mode.mockReturnValue('folders');
      rig.collapsed.add('apps');
      reveal.request('web', 1);
      rig.tasks.isActive.mockReturnValue(false);
      reveal.placed();
    });

    it('WHEN the package graph places THEN task mode is left, the filters edited, apps expanded and web selected, in order', async () => {
      await flush();

      expect(rig.log).toStrictEqual(['toggle', 'edit', 'expand apps', 'select web']);
    });

    it('WHEN the package graph places THEN the one edit ticks web again', async () => {
      await flush();

      expect(rig.edit.mock.calls).toStrictEqual([[rig.mounted, NONE]]);
    });
  });
});
