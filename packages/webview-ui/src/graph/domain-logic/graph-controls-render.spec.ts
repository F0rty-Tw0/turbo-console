import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderControls } from './graph-controls-render.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import type { ControlsElements } from '../common/controls-elements.type.ts';
import { CLEAR_FOCUS_LABEL, FOCUS_FOLDER_LABEL } from '../common/details.const.ts';
import type { ControlsView } from '../common/graph-controls.type.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import { boardsControlsMock, controlsTogglesMock } from '../test/mocks/boards-controls.mock.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { groupOf, iconClassOf, rowOf } from '../test/utils/controls-elements.spec.util.ts';
import { menuFiltersOf } from '../test/utils/widget-menu.spec.util.ts';

const ALL = ['docs', 'web', '@acme/config', '@acme/ui', '@acme/utils'];

const WEB_FOCUS: GraphFocus = { kind: 'package', name: 'web' };

const APPS_FOCUS: GraphFocus = { kind: 'folder', folder: 'apps' };

const PACKAGES_FOCUS: GraphFocus = { kind: 'folder', folder: 'packages' };

/** Every boards package visible, nothing filtered, the panel open and grouped, no folder collapsed, with `overrides` on top. */
const viewOf = (overrides: Partial<ControlsView>): ControlsView => {
  const filters = menuFiltersOf([], null);
  const view: ControlsView = {
    filters,
    visible: new Set(ALL),
    total: ALL.length,
    selected: null,
    isOpen: true,
    grouped: true,
    canToggle: true,
    collapsed: new Set(),
    ...overrides
  };

  return view;
};

const rendered = (view: ControlsView): ControlsElements => {
  const elements = boardsControlsMock();
  const toggles = controlsTogglesMock();

  renderControls(elements, toggles, view);

  return elements;
};

describe('FEATURE: renderControls', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe.each([
    { title: 'collapsed', collapsed: ['apps'], icon: 'codicon codicon-chevron-right', label: 'Expand folder apps', expanded: 'false' },
    { title: 'expanded', collapsed: [], icon: 'codicon codicon-chevron-down', label: 'Collapse folder apps', expanded: 'true' }
  ])('GIVEN the apps folder $title', ({ collapsed, icon, label, expanded }) => {
    it(`WHEN rendered THEN its toggle draws ${icon}, is named and titled ${label}, and reads aria-expanded ${expanded}`, () => {
      const view = viewOf({ collapsed: new Set(collapsed) });
      const { toggle } = groupOf(rendered(view), 'apps');

      expect(iconClassOf(toggle)).toBe(icon);
      expect(toggle.getAttribute('aria-label')).toBe(label);
      expect(toggle.title).toBe(label);
      expect(toggle.getAttribute('aria-expanded')).toBe(expanded);
      expect(toggle.textContent).toBe('');
    });
  });

  describe.each([
    { title: 'flat', grouped: false, canToggle: false, isToggleHidden: true, isFocusHidden: true },
    {
      title: 'grouped before the folder layout is drawn',
      grouped: true,
      canToggle: false,
      isToggleHidden: true,
      isFocusHidden: false
    },
    { title: 'grouped with the folder layout drawn', grouped: true, canToggle: true, isToggleHidden: false, isFocusHidden: false }
  ])('GIVEN the page $title', ({ grouped, canToggle, isToggleHidden, isFocusHidden }) => {
    it(`WHEN rendered THEN the apps header toggle is hidden=${isToggleHidden} and its Focus hidden=${isFocusHidden}`, () => {
      const elements = rendered(viewOf({ grouped, canToggle }));
      const { toggle, focus } = groupOf(elements, 'apps');

      expect([toggle.hidden, focus.hidden]).toStrictEqual([isToggleHidden, isFocusHidden]);
    });
  });

  describe.each([
    { title: 'no focus', focus: null, pressed: ['false', 'false'], titles: [FOCUS_PACKAGE_TITLE, FOCUS_PACKAGE_TITLE] },
    { title: 'web focused', focus: WEB_FOCUS, pressed: ['true', 'false'], titles: [CLEAR_FOCUS_LABEL, FOCUS_PACKAGE_TITLE] }
  ])('GIVEN $title', ({ focus, pressed, titles }) => {
    it(`WHEN rendered THEN the web and docs row Focus buttons read aria-pressed ${pressed.join(', ')} and keep their names`, () => {
      const filters = menuFiltersOf([], focus);
      const elements = rendered(viewOf({ filters }));
      const buttons = [rowOf(elements, 'web').focus, rowOf(elements, 'docs').focus];
      const states = buttons.map((button) => [button.getAttribute('aria-pressed'), button.title, button.getAttribute('aria-label')]);

      expect(states).toStrictEqual([
        [pressed[0], titles[0], 'Focus web'],
        [pressed[1], titles[1], 'Focus docs']
      ]);
    });
  });

  describe.each([
    { title: 'apps focused', focus: APPS_FOCUS, pressed: 'true', hoverTitle: CLEAR_FOCUS_LABEL },
    { title: 'packages focused', focus: PACKAGES_FOCUS, pressed: 'false', hoverTitle: FOCUS_FOLDER_LABEL },
    { title: 'no focus', focus: null, pressed: 'false', hoverTitle: FOCUS_FOLDER_LABEL }
  ])('GIVEN $title', ({ focus, pressed, hoverTitle }) => {
    it(`WHEN rendered THEN the apps header Focus reads aria-pressed ${pressed}, is titled ${hoverTitle} and keeps its name`, () => {
      const filters = menuFiltersOf([], focus);
      const { focus: button } = groupOf(rendered(viewOf({ filters })), 'apps');

      expect(button.getAttribute('aria-pressed')).toBe(pressed);
      expect(button.title).toBe(hoverTitle);
      expect(button.getAttribute('aria-label')).toBe('Focus folder apps');
      expect(button.textContent).toBe('');
    });
  });

  describe.each([
    { title: 'nothing filtered', hidden: [], focus: null, shown: ALL, isHidden: true, text: 'Show all' },
    {
      title: 'docs and web unticked',
      hidden: ['docs', 'web'],
      focus: null,
      shown: ALL.slice(2),
      isHidden: false,
      text: 'Show all (2 hidden)'
    },
    { title: 'a focus that hides nothing', hidden: [], focus: WEB_FOCUS, shown: ALL, isHidden: false, text: 'Show all' }
  ])('GIVEN $title', ({ hidden, focus, shown, isHidden, text }) => {
    it(`WHEN rendered THEN Show all is hidden=${isHidden}, reads ${text} and is titled the same`, () => {
      const filters = menuFiltersOf(hidden, focus);
      const { showAll } = rendered(viewOf({ filters, visible: new Set(shown) }));

      expect(showAll).toMatchObject({ hidden: isHidden, textContent: text, title: text });
      expect(showAll.getAttribute('aria-disabled')).toBeNull();
    });
  });
});
