import { describe, expect, it } from 'vitest';

import { folderMenuOf, folderMenuStateOf, menuTargetOf, packageMenuOf, packageMenuStateOf } from './widget-menu-model.util.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import { START_TRACE_LABEL, START_TRACE_TITLE } from '../common/details.const.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { MenuItemModel } from '../common/widget-menu.type.ts';
import type { MenuTarget, ShowFolderState } from '../common/widget.type.ts';
import { folderActionsMock, packageActionsMock } from '../test/mocks/widget-menu.mock.ts';
import { BOARDS_NAMES, boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { folderInspection, link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';
import {
  callCountOf,
  folderStateOf,
  itemLabelled,
  labelsOf,
  menuFiltersOf,
  packageStateOf
} from '../test/utils/widget-menu.spec.util.ts';

const APPS_FOCUS: GraphFocus = { kind: 'folder', folder: 'apps' };

const WEB_FOCUS: GraphFocus = { kind: 'package', name: 'web' };

const ALL_VISIBLE: ReadonlySet<string> = new Set(BOARDS_NAMES);

const APPS_TARGET: MenuTarget = { kind: 'folder', folder: 'apps' };

const WEB_TARGET: MenuTarget = { kind: 'package', name: 'web' };

const SHOW_ALL: ShowFolderState = { checked: 'true', isDisabled: false };

const SHOW_SOME: ShowFolderState = { checked: 'mixed', isDisabled: false };

const SHOW_NONE: ShowFolderState = { checked: 'false', isDisabled: false };

const SHOW_LOCKED: ShowFolderState = { checked: 'true', isDisabled: true };

describe('FEATURE: folderMenuOf', () => {
  describe('GIVEN an expanded folder, not the focus, all shown', () => {
    const model = folderMenuOf('apps', folderStateOf(), folderActionsMock());

    it('WHEN it is listed THEN it reads Collapse, Focus folder, a separator and Show folder', () => {
      const labels = labelsOf(model);

      expect(labels).toStrictEqual(['Collapse', 'Focus folder', '---', 'Show folder']);
    });

    it('WHEN Show folder is read THEN it is a checked, enabled menuitemcheckbox', () => {
      const { role, checked, isDisabled } = itemLabelled(model, 'Show folder');

      expect({ role, checked, isDisabled }).toStrictEqual({ role: 'menuitemcheckbox', checked: 'true', isDisabled: false });
    });

    it('WHEN Collapse is read THEN it is a plain enabled menuitem', () => {
      const { role, checked, isDisabled } = itemLabelled(model, 'Collapse');

      expect({ role, checked, isDisabled }).toStrictEqual({ role: 'menuitem', checked: null, isDisabled: false });
    });
  });

  it('GIVEN a collapsed folder that is the focus WHEN it is listed THEN it reads Expand and Clear focus', () => {
    const state = folderStateOf({ isCollapsed: true, isFocus: true });

    const labels = labelsOf(folderMenuOf('apps', state, folderActionsMock()));

    expect(labels).toStrictEqual(['Expand', 'Clear focus', '---', 'Show folder']);
  });

  it('GIVEN a folder partly shown WHEN Show folder is read THEN it is mixed', () => {
    const state = folderStateOf({ show: SHOW_SOME });

    const item = itemLabelled(folderMenuOf('apps', state, folderActionsMock()), 'Show folder');

    expect(item.checked).toBe('mixed');
  });

  it('GIVEN a folder whose group checkbox is locked WHEN Show folder is read THEN it is disabled', () => {
    const state = folderStateOf({ show: SHOW_LOCKED });

    const item = itemLabelled(folderMenuOf('apps', state, folderActionsMock()), 'Show folder');

    expect(item.isDisabled).toBe(true);
  });

  describe.each(['apps', '', '__proto__'])('GIVEN the folder %j', (folder) => {
    it.each([
      { label: 'Collapse', state: folderStateOf(), action: 'toggle', args: [folder] },
      { label: 'Expand', state: folderStateOf({ isCollapsed: true }), action: 'toggle', args: [folder] },
      { label: 'Focus folder', state: folderStateOf(), action: 'focusFolder', args: [folder] },
      { label: 'Clear focus', state: folderStateOf({ isFocus: true }), action: 'clearFocus', args: [] },
      { label: 'Show folder', state: folderStateOf(), action: 'showFolder', args: [folder] }
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
  describe('GIVEN a package, not the focus, its checkbox ticked', () => {
    const model = packageMenuOf('web', packageStateOf(), packageActionsMock());

    it('WHEN it is listed THEN Start trace carries the trace title', () => {
      const startTrace = itemLabelled(model, START_TRACE_LABEL);

      expect(startTrace.title).toBe(START_TRACE_TITLE);
    });

    it('WHEN it is listed THEN it reads View Package Details, Focus, Start trace, a separator and Show package', () => {
      const labels = labelsOf(model);

      expect(labels).toStrictEqual(['View Package Details', 'Focus', 'Start trace', '---', 'Show package']);
    });

    it('WHEN Show package is read THEN it is a checked, enabled menuitemcheckbox', () => {
      const { role, checked, isDisabled } = itemLabelled(model, 'Show package');

      expect({ role, checked, isDisabled }).toStrictEqual({ role: 'menuitemcheckbox', checked: 'true', isDisabled: false });
    });
  });

  describe('GIVEN the focused package', () => {
    const model = packageMenuOf('web', packageStateOf({ isFocus: true }), packageActionsMock());

    it('WHEN it is listed THEN Focus reads Clear focus', () => {
      const labels = labelsOf(model);

      expect(labels).toStrictEqual(['View Package Details', 'Clear focus', 'Start trace', '---', 'Show package']);
    });

    it('WHEN Show package is read THEN it is disabled', () => {
      const item = itemLabelled(model, 'Show package');

      expect(item.isDisabled).toBe(true);
    });
  });

  it.each([
    { title: 'no visible task', hasTasks: false, expected: ['View Package Details', 'Focus', 'Start trace', '---', 'Show package'] },
    {
      title: 'a visible task',
      hasTasks: true,
      expected: ['View Package Details', 'Focus', 'Start trace', 'Show tasks', '---', 'Show package']
    }
  ])('GIVEN a package with $title WHEN it is listed THEN it reads $expected', ({ hasTasks, expected }) => {
    const labels = labelsOf(packageMenuOf('web', packageStateOf({ hasTasks }), packageActionsMock()));

    expect(labels).toStrictEqual(expected);
  });

  it('GIVEN a package whose checkbox is unticked WHEN Show package is read THEN it is unchecked', () => {
    const item = itemLabelled(packageMenuOf('web', packageStateOf({ isShown: false }), packageActionsMock()), 'Show package');

    expect(item.checked).toBe('false');
  });

  describe.each(['web', 'constructor', '__proto__'])('GIVEN the package %j', (name) => {
    it.each([
      { label: 'View Package Details', state: packageStateOf(), action: 'openDetails', args: [name] },
      { label: 'Focus', state: packageStateOf(), action: 'focus', args: [name] },
      { label: 'Clear focus', state: packageStateOf({ isFocus: true }), action: 'clearFocus', args: [] },
      { label: 'Start trace', state: packageStateOf(), action: 'startTrace', args: [] },
      { label: 'Show package', state: packageStateOf({ isShown: false }), action: 'setShown', args: [name, true] },
      { label: 'Show package', state: packageStateOf(), action: 'setShown', args: [name, false] },
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
      { title: 'web unticked', name: 'web', hidden: ['web'], focus: null, expected: packageStateOf({ isShown: false }) },
      { title: 'web focused', name: 'web', hidden: [], focus: WEB_FOCUS, expected: packageStateOf({ isFocus: true }) },
      { title: 'docs while web is focused', name: 'docs', hidden: [], focus: WEB_FOCUS, expected: packageStateOf() },
      { title: 'web while apps is focused', name: 'web', hidden: [], focus: APPS_FOCUS, expected: packageStateOf() }
    ])('WHEN $title THEN the state is $expected', ({ name, hidden, focus, expected }) => {
      const filters = menuFiltersOf(hidden, focus);

      const state = packageMenuStateOf(name, filters, ALL_VISIBLE, false);

      expect(state).toStrictEqual(expected);
    });

    it('WHEN web has a visible task THEN the state says so', () => {
      const state = packageMenuStateOf('web', menuFiltersOf([], null), ALL_VISIBLE, true);

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
