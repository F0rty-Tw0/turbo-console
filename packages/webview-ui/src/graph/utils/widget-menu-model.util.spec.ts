import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { folderMenuOf, folderMenuStateOf, menuTargetOf, packageMenuOf, packageMenuStateOf } from './widget-menu-model.util.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import { START_TRACE_LABEL, START_TRACE_TITLE } from '../common/details.const.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { MenuItemModel } from '../common/widget-menu.type.ts';
import type { MenuTarget, ShowFolderState } from '../common/widget.type.ts';
import { graphIconConstMock } from '../test/mocks/graph-icon-const.mock.ts';
import { folderActionsMock, packageActionsMock } from '../test/mocks/widget-menu.mock.ts';
import { SWAPPED_ACTION_ICONS_STUB as SWAPPED } from '../test/stubs/action-icons.stub.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { folderInspection, link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';
import {
  callCountOf,
  folderStateOf,
  iconsOf,
  itemLabelled,
  labelsOf,
  menuFiltersOf,
  packageStateOf
} from '../test/utils/widget-menu.spec.util.ts';

const APPS_FOCUS: GraphFocus = { kind: 'folder', folder: 'apps' };

const WEB_FOCUS: GraphFocus = { kind: 'package', name: 'web' };

const APPS_TARGET: MenuTarget = { kind: 'folder', folder: 'apps' };

const WEB_TARGET: MenuTarget = { kind: 'package', name: 'web' };

const SHOW_ALL: ShowFolderState = { checked: 'true', isDisabled: false };

const SHOW_SOME: ShowFolderState = { checked: 'mixed', isDisabled: false };

const SHOW_NONE: ShowFolderState = { checked: 'false', isDisabled: false };

const SHOW_LOCKED: ShowFolderState = { checked: 'true', isDisabled: true };

describe('FEATURE: folderMenuOf', () => {
  it.each([
    {
      title: 'expanded, not the focus, all shown',
      state: folderStateOf(),
      labels: ['Collapse', 'Focus folder', '---', 'Exclude folder'],
      icons: ['fold', 'target', '---', 'eye-closed']
    },
    {
      title: 'collapsed, the focus, all shown',
      state: folderStateOf({ isCollapsed: true, isFocus: true }),
      labels: ['Expand', 'Clear focus', '---', 'Exclude folder'],
      icons: ['unfold', 'close', '---', 'eye-closed']
    },
    {
      title: 'partly shown',
      state: folderStateOf({ show: SHOW_SOME }),
      labels: ['Collapse', 'Focus folder', '---', 'Show all in folder'],
      icons: ['fold', 'target', '---', 'eye']
    },
    {
      title: 'with none shown',
      state: folderStateOf({ show: SHOW_NONE }),
      labels: ['Collapse', 'Focus folder', '---', 'Show all in folder'],
      icons: ['fold', 'target', '---', 'eye']
    }
  ])('GIVEN a folder $title WHEN it is listed THEN it reads $labels with the icons $icons', ({ state, labels, icons }) => {
    const model = folderMenuOf('apps', state, folderActionsMock());

    const listed = [labelsOf(model), iconsOf(model)];

    expect(listed).toStrictEqual([labels, icons]);
  });

  it.each([
    { label: 'Collapse', state: folderStateOf() },
    { label: 'Exclude folder', state: folderStateOf() },
    { label: 'Show all in folder', state: folderStateOf({ show: SHOW_SOME }) }
  ])('GIVEN a folder whose group checkbox is free WHEN $label is read THEN it is enabled', ({ label, state }) => {
    const item = itemLabelled(folderMenuOf('apps', state, folderActionsMock()), label);

    expect(item.isDisabled).toBe(false);
  });

  describe('GIVEN a folder whose group checkbox is locked', () => {
    it('WHEN Exclude folder is read THEN it is disabled', () => {
      const state = folderStateOf({ show: SHOW_LOCKED });

      const item = itemLabelled(folderMenuOf('apps', state, folderActionsMock()), 'Exclude folder');

      expect(item.isDisabled).toBe(true);
    });
  });

  describe.each(['apps', '', '__proto__'])('GIVEN the folder %j', (folder) => {
    it.each([
      { label: 'Collapse', state: folderStateOf(), action: 'toggle', args: [folder] },
      { label: 'Expand', state: folderStateOf({ isCollapsed: true }), action: 'toggle', args: [folder] },
      { label: 'Focus folder', state: folderStateOf(), action: 'focusFolder', args: [folder] },
      { label: 'Clear focus', state: folderStateOf({ isFocus: true }), action: 'clearFocus', args: [] },
      { label: 'Exclude folder', state: folderStateOf(), action: 'showFolder', args: [folder] },
      { label: 'Show all in folder', state: folderStateOf({ show: SHOW_SOME }), action: 'showFolder', args: [folder] }
    ] as const)('WHEN $label runs THEN only $action is called', ({ label, state, action, args }) => {
      const actions = folderActionsMock();
      const model: MenuItemModel[] = folderMenuOf(folder, state, actions);

      itemLabelled(model, label).run();

      expect(callCountOf(actions)).toBe(1);
      expect(actions[action]).toHaveBeenCalledWith(...args);
    });
  });
});

describe('FEATURE: packageMenuOf', () => {
  describe('GIVEN a package with a visible task, not the focus', () => {
    const model = packageMenuOf('web', packageStateOf({ hasTasks: true }), packageActionsMock());

    it('WHEN it is listed THEN Start trace carries the trace title', () => {
      const startTrace = itemLabelled(model, START_TRACE_LABEL);

      expect(startTrace.title).toBe(START_TRACE_TITLE);
    });

    it('WHEN it is listed THEN it reads View Package Details, Focus, Start trace, Show tasks, a separator and Exclude', () => {
      const labels = labelsOf(model);

      expect(labels).toStrictEqual(['View Package Details', 'Focus', 'Start trace', 'Show tasks', '---', 'Exclude']);
    });

    it('WHEN its icons are read THEN they follow spec D6', () => {
      const icons = iconsOf(model);

      expect(icons).toStrictEqual(['file-text', 'target', 'git-commit', 'tasklist', '---', 'eye-closed']);
    });

    it('WHEN Exclude is read THEN it is enabled', () => {
      const item = itemLabelled(model, 'Exclude');

      expect(item.isDisabled).toBe(false);
    });
  });

  describe('GIVEN the focused package', () => {
    const model = packageMenuOf('web', packageStateOf({ isFocus: true }), packageActionsMock());

    it('WHEN it is listed THEN Focus reads Clear focus', () => {
      const labels = labelsOf(model);

      expect(labels).toStrictEqual(['View Package Details', 'Clear focus', 'Start trace', '---', 'Exclude']);
    });

    it('WHEN Clear focus is read THEN it draws the clear focus icon', () => {
      const item = itemLabelled(model, 'Clear focus');

      expect(item.icon).toBe('close');
    });

    it('WHEN Exclude is read THEN it is disabled', () => {
      const item = itemLabelled(model, 'Exclude');

      expect(item.isDisabled).toBe(true);
    });
  });

  it.each([
    { title: 'no visible task', hasTasks: false, expected: ['View Package Details', 'Focus', 'Start trace', '---', 'Exclude'] },
    {
      title: 'a visible task',
      hasTasks: true,
      expected: ['View Package Details', 'Focus', 'Start trace', 'Show tasks', '---', 'Exclude']
    }
  ])('GIVEN a package with $title WHEN it is listed THEN it reads $expected', ({ hasTasks, expected }) => {
    const labels = labelsOf(packageMenuOf('web', packageStateOf({ hasTasks }), packageActionsMock()));

    expect(labels).toStrictEqual(expected);
  });

  describe.each(['web', 'constructor', '__proto__'])('GIVEN the package %j', (name) => {
    it.each([
      { label: 'View Package Details', state: packageStateOf(), action: 'openDetails', args: [name] },
      { label: 'Focus', state: packageStateOf(), action: 'focus', args: [name] },
      { label: 'Clear focus', state: packageStateOf({ isFocus: true }), action: 'clearFocus', args: [] },
      { label: 'Start trace', state: packageStateOf(), action: 'startTrace', args: [] },
      { label: 'Exclude', state: packageStateOf(), action: 'setShown', args: [name, false] },
      { label: 'Show tasks', state: packageStateOf({ hasTasks: true }), action: 'showTasks', args: [name] }
    ] as const)('WHEN $label runs from $state THEN only $action is called with $args', ({ label, state, action, args }) => {
      const actions = packageActionsMock();
      const model: MenuItemModel[] = packageMenuOf(name, state, actions);

      itemLabelled(model, label).run();

      expect(callCountOf(actions)).toBe(1);
      expect(actions[action]).toHaveBeenCalledWith(...args);
    });
  });
});

describe('FEATURE: folderMenuStateOf', () => {
  describe('GIVEN the boards scene with packages collapsed', () => {
    const scene = boardsSceneOf(['packages']);

    it.each([
      { title: 'apps, nothing hidden', folder: 'apps', hidden: [], focus: null, expected: folderStateOf() },
      {
        title: 'packages, collapsed',
        folder: 'packages',
        hidden: [],
        focus: null,
        expected: folderStateOf({ isCollapsed: true })
      },
      { title: 'apps, the folder focus', folder: 'apps', hidden: [], focus: APPS_FOCUS, expected: folderStateOf({ isFocus: true }) },
      {
        title: 'apps, docs unticked',
        folder: 'apps',
        hidden: ['docs'],
        focus: null,
        expected: folderStateOf({ show: SHOW_SOME })
      },
      {
        title: 'apps, web focused and docs unticked',
        folder: 'apps',
        hidden: ['docs'],
        focus: WEB_FOCUS,
        expected: folderStateOf({ show: SHOW_NONE })
      }
    ])('WHEN $title THEN the state is $expected', ({ folder, hidden, focus, expected }) => {
      const filters = menuFiltersOf(hidden, focus);

      const state = folderMenuStateOf(folder, scene, filters);

      expect(state).toStrictEqual(expected);
    });
  });

  it('GIVEN no scene WHEN apps is read THEN it is expanded with no packages to show', () => {
    const state = folderMenuStateOf('apps', null, menuFiltersOf([], null));

    expect(state).toStrictEqual(folderStateOf({ show: SHOW_ALL }));
  });
});

describe('FEATURE: packageMenuStateOf', () => {
  describe('GIVEN every boards package visible', () => {
    it.each([
      { title: 'web ticked, no focus', name: 'web', hidden: [], focus: null, expected: packageStateOf() },
      { title: 'web focused', name: 'web', hidden: [], focus: WEB_FOCUS, expected: packageStateOf({ isFocus: true }) },
      { title: 'docs while web is focused', name: 'docs', hidden: [], focus: WEB_FOCUS, expected: packageStateOf() },
      { title: 'web while apps is focused', name: 'web', hidden: [], focus: APPS_FOCUS, expected: packageStateOf() }
    ])('WHEN $title THEN the state is $expected', ({ name, hidden, focus, expected }) => {
      const filters = menuFiltersOf(hidden, focus);

      const state = packageMenuStateOf(name, filters, false);

      expect(state).toStrictEqual(expected);
    });

    it('WHEN web has a visible task THEN the state says so', () => {
      const state = packageMenuStateOf('web', menuFiltersOf([], null), true);

      expect(state).toStrictEqual(packageStateOf({ hasTasks: true }));
    });
  });
});

describe('FEATURE: menuTargetOf', () => {
  it.each([
    { title: 'a folder', inspection: folderInspection('apps'), expected: APPS_TARGET },
    { title: 'a package', inspection: pkg('web'), expected: WEB_TARGET },
    { title: 'a link', inspection: link('web', 'docs'), expected: null },
    { title: 'a picking', inspection: pick('web', false), expected: null },
    { title: 'a trace', inspection: trace('web', 'docs'), expected: null },
    { title: 'nothing', inspection: NO_INSPECTION, expected: null }
  ])('GIVEN $title inspected WHEN its menu target is read THEN it is $expected', ({ inspection, expected }) => {
    const target = menuTargetOf(inspection);

    expect(target).toStrictEqual(expected);
  });
});

describe('FEATURE: menu icons from the action icon table', () => {
  beforeEach((): void => {
    vi.resetModules();
    vi.doMock('../common/graph-icon.const.ts', (): object => graphIconConstMock(SWAPPED));
  });

  afterEach((): void => {
    vi.doUnmock('../common/graph-icon.const.ts');
    vi.resetModules();
  });

  describe('GIVEN a table where every action draws another icon', () => {
    it.each([
      {
        title: 'with a visible task, not the focus',
        state: packageStateOf({ hasTasks: true }),
        icons: [SWAPPED.openDetails, SWAPPED.focus, SWAPPED.startTrace, SWAPPED.showTasks, '---', SWAPPED.exclude]
      },
      {
        title: 'that is the focus',
        state: packageStateOf({ isFocus: true }),
        icons: [SWAPPED.openDetails, SWAPPED.clearFocus, SWAPPED.startTrace, '---', SWAPPED.exclude]
      }
    ])('WHEN the menu of a package $title is built THEN its icons follow the table', async ({ state, icons }) => {
      const swapped = await import('./widget-menu-model.util.ts');
      const model = swapped.packageMenuOf('web', state, packageActionsMock());

      expect(iconsOf(model)).toStrictEqual(icons);
    });

    it.each([
      {
        title: 'expanded, not the focus, all shown',
        state: folderStateOf(),
        icons: [SWAPPED.collapse, SWAPPED.focus, '---', SWAPPED.exclude]
      },
      {
        title: 'collapsed, the focus, partly shown',
        state: folderStateOf({ isCollapsed: true, isFocus: true, show: SHOW_SOME }),
        icons: [SWAPPED.expand, SWAPPED.clearFocus, '---', SWAPPED.showAll]
      }
    ])('WHEN the menu of a folder $title is built THEN its icons follow the table', async ({ state, icons }) => {
      const swapped = await import('./widget-menu-model.util.ts');
      const model = swapped.folderMenuOf('apps', state, folderActionsMock());

      expect(iconsOf(model)).toStrictEqual(icons);
    });
  });
});
