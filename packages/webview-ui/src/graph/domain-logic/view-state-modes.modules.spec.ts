import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ViewStateModes } from './view-state-modes.ts';
import type { GraphViewState, ModulesViewState, PackageViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import { freshModulesViewOf, freshViewStateOf } from '../utils/fresh-view-state.util.ts';

const FRESH_WEB = freshModulesViewOf('web');

const WEB_VIEW: ModulesViewState = { ...FRESH_WEB, expanded: ['src'] };

const FRESH_H1 = freshViewStateOf('h1');

const ORIGIN = { x: 0, y: 0 };

const PACKAGE_FIELDS: PackageViewState = {
  hash: 'h1',
  zoom: 1,
  pan: ORIGIN,
  fitted: false,
  selected: null,
  controlsOpen: true,
  search: '',
  depth: 1,
  hidden: [],
  focus: null,
  tags: [],
  detailsOpen: true,
  link: null,
  trace: null,
  folder: null,
  grouped: true,
  collapsed: []
};

const saverOf = (): ViewStateSaver => {
  const saver: ViewStateSaver = { schedule: vi.fn<(state: GraphViewState) => void>(), flush: vi.fn() };

  return saver;
};

describe('FEATURE: ViewStateModes modules view', () => {
  let modes: ViewStateModes;

  describe('GIVEN nothing saved', () => {
    beforeEach(() => {
      modes = new ViewStateModes(saverOf(), null);
    });

    it('WHEN a modules view is saved THEN the mode is modules and the view is kept', () => {
      modes.saveModules(WEB_VIEW, 'h1');

      expect([modes.mode(), modes.modules()]).toStrictEqual(['modules', WEB_VIEW]);
    });

    it('WHEN a modules view is saved THEN the fresh state of the hash carries it', () => {
      modes.saveModules(WEB_VIEW, 'h1');

      expect(modes.current()).toStrictEqual({ ...FRESH_H1, mode: 'modules', modules: WEB_VIEW });
    });
  });

  describe('GIVEN a modules view saved in modules mode', () => {
    beforeEach(() => {
      modes = new ViewStateModes(saverOf(), null);
      modes.saveModules(WEB_VIEW, 'h1');
    });

    it('WHEN the package side schedules a save THEN nothing is written', () => {
      const before = modes.current();

      modes.packages.schedule({ ...PACKAGE_FIELDS, search: 'x' });

      expect(modes.current()).toBe(before);
    });

    it('WHEN the mode is set to packages THEN the modules view is kept', () => {
      modes.setMode('packages', 'h1');

      expect([modes.mode(), modes.modules()]).toStrictEqual(['packages', WEB_VIEW]);
    });

    it('WHEN the mode is set to packages and the package side saves THEN the modules view is still kept', () => {
      modes.setMode('packages', 'h1');
      modes.packages.schedule({ ...PACKAGE_FIELDS, search: 'x' });

      expect([modes.current()?.search, modes.modules()]).toStrictEqual(['x', WEB_VIEW]);
    });
  });
});
