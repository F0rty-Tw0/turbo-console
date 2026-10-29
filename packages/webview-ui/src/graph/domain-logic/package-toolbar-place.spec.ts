import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { placeToolbar } from './package-toolbar-place.ts';
import type { PackageMenuState, PackageToolbarElements, ToolbarEntry } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
import { accessLogOf } from '../test/utils/access-log.spec.util.ts';
import { isShownButton, toolbarButtonsOf } from '../test/utils/package-toolbar.spec.util.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';

const WITH_TASKS: PackageMenuState = { isFocus: false, hasTasks: true };
const NO_TASKS: PackageMenuState = { isFocus: false, hasTasks: false };
const AT_WEB = rectOf(100, 50, 124, 74);

const entryOf = (state: PackageMenuState): ToolbarEntry => {
  const elements = widgetRowViewsMock().views.packageToolbar('web', 'apps');
  const entry: ToolbarEntry = { name: 'web', folder: 'apps', state, elements, shown: [], preferred: 'focus' };

  return entry;
};

/** The buttons of the toolbar that are not hidden, by label. */
const shownLabelsOf = (elements: PackageToolbarElements): (string | null)[] => {
  const shown = toolbarButtonsOf(elements).filter(isShownButton);

  return shown.map((button): string | null => button.getAttribute('aria-label'));
};

describe('FEATURE: placeToolbar', () => {
  let container: HTMLElement;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    container = document.createElement('div');
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the web toolbar in the folder apps with tasks', () => {
    let entry: ToolbarEntry;

    beforeEach((): void => {
      entry = entryOf(WITH_TASKS);
    });

    it('WHEN it is placed at {100, 50, 124, 74} THEN its root is shown at translate(100px, 50px)', () => {
      placeToolbar(entry, AT_WEB, 1, container);

      expect(entry.elements.root).toHaveProperty('hidden', false);
      expect(entry.elements.root).toHaveProperty('style.transform', 'translate(100px, 50px)');
    });

    it('WHEN it is placed at zoom 0.49 THEN only the "…" is shown', () => {
      placeToolbar(entry, AT_WEB, 0.49, container);

      expect(shownLabelsOf(entry.elements)).toStrictEqual(['Actions for web']);
    });

    it('WHEN it is placed at zoom 1 THEN every button is shown', () => {
      placeToolbar(entry, AT_WEB, 1, container);

      expect(shownLabelsOf(entry.elements)).toStrictEqual([
        'Focus web',
        'Start trace',
        'Show tasks',
        'Collapse folder apps',
        'Actions for web'
      ]);
    });

    it('WHEN it is placed at zoom 1 and then 0.49 THEN Focus is the Tab stop and then the "…" is', () => {
      const { focus, ellipsis } = entry.elements;

      placeToolbar(entry, AT_WEB, 1, container);
      const atFull = [focus.tabIndex, ellipsis.tabIndex];

      placeToolbar(entry, AT_WEB, 0.49, container);
      const atCompact = [focus.tabIndex, ellipsis.tabIndex];

      expect(atFull).toStrictEqual([0, -1]);
      expect(atCompact).toStrictEqual([-1, 0]);
    });

    it('WHEN Focus has focus and it is placed at zoom 0.49 THEN the "…" has focus', () => {
      const { focus, ellipsis } = entry.elements;

      placeToolbar(entry, AT_WEB, 1, container);
      focus.focus();
      placeToolbar(entry, AT_WEB, 0.49, container);

      expect(document.activeElement).toBe(ellipsis);
    });

    it('WHEN Focus has focus and it is placed at zoom 1 again THEN Focus keeps it', () => {
      const { focus } = entry.elements;

      placeToolbar(entry, AT_WEB, 1, container);
      focus.focus();
      placeToolbar(entry, AT_WEB, 1, container);

      expect(document.activeElement).toBe(focus);
    });

    it('WHEN Show tasks has focus and web loses its tasks THEN the "…" has focus and Show tasks is hidden', () => {
      const { showTasks, ellipsis } = entry.elements;

      placeToolbar(entry, AT_WEB, 1, container);
      showTasks.focus();
      placeToolbar({ ...entry, state: NO_TASKS }, AT_WEB, 1, container);

      expect(document.activeElement).toBe(ellipsis);
      expect(showTasks.hidden).toBe(true);
    });

    it('WHEN it is placed again at the same rect and zoom THEN nothing is written and no layout is read', () => {
      placeToolbar(entry, AT_WEB, 1, container);

      const buttons = toolbarButtonsOf(entry.elements);
      const watched = [entry.elements.root, ...buttons];
      const log = accessLogOf(watched);

      placeToolbar(entry, AT_WEB, 1, container);

      expect(log).toStrictEqual([]);
    });

    it('WHEN it is placed nowhere after it was placed THEN its root is hidden', () => {
      placeToolbar(entry, AT_WEB, 1, container);
      placeToolbar(entry, null, 1, container);

      expect(entry.elements.root.hidden).toBe(true);
    });

    it('WHEN the "…" has focus and it is placed nowhere THEN the container has focus', () => {
      placeToolbar(entry, AT_WEB, 1, container);
      entry.elements.ellipsis.focus();
      placeToolbar(entry, null, 1, container);

      expect(document.activeElement).toBe(container);
    });
  });

  describe('GIVEN the web toolbar on a flat page and nothing focused', () => {
    it('WHEN it is placed at zoom 1 THEN nothing has focus', () => {
      const elements = widgetRowViewsMock().views.packageToolbar('web', null);
      const entry: ToolbarEntry = { name: 'web', folder: null, state: WITH_TASKS, elements, shown: [], preferred: 'focus' };

      placeToolbar(entry, AT_WEB, 1, container);

      expect(document.activeElement).toBeNull();
    });
  });
});
