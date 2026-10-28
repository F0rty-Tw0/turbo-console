import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderControls } from './graph-controls-render.ts';
import type { ControlsElements } from '../common/controls-elements.type.ts';
import type { ControlsView } from '../common/graph-controls.type.ts';
import { boardsControlsMock, controlsTogglesMock } from '../test/mocks/boards-controls.mock.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { groupOf, iconClassOf } from '../test/utils/controls-elements.spec.util.ts';
import { menuFiltersOf } from '../test/utils/widget-menu.spec.util.ts';

const ALL = ['docs', 'web', '@acme/config', '@acme/ui', '@acme/utils'];

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
});
