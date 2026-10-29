import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { placeToolbar, releaseFocusOf } from './package-toolbar-place.ts';
import type { PackageMenuState, PackageToolbarElements, ToolbarEntry } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';

const WITH_TASKS: PackageMenuState = { isFocus: false, hasTasks: true };
const NO_TASKS: PackageMenuState = { isFocus: false, hasTasks: false };
const AT_WEB = rectOf(100, 50, 124, 74);

const entryOf = (state: PackageMenuState): ToolbarEntry => {
  const elements = widgetRowViewsMock().views.packageToolbar('web', 'apps');
  const entry: ToolbarEntry = { name: 'web', folder: 'apps', state, elements };

  return entry;
};

/** The buttons of the toolbar that are not hidden, by label. */
const shownLabelsOf = (elements: PackageToolbarElements): (string | null)[] => {
  const { focus, startTrace, showTasks, collapse, ellipsis } = elements;
  const buttons = [focus, startTrace, showTasks, collapse, ellipsis];

  return buttons.filter((button) => button !== null && !button.hidden).map((button) => button?.getAttribute('aria-label') ?? null);
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
});

describe('FEATURE: releaseFocusOf', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('GIVEN focus on a button inside the root WHEN it is released THEN the container has focus', () => {
    const { root, focus } = widgetRowViewsMock().views.packageToolbar('web', null);
    const container = document.createElement('div');

    focus.focus();
    releaseFocusOf(root, container);

    expect(document.activeElement).toBe(container);
  });

  it('GIVEN focus elsewhere WHEN it is released THEN focus stays there', () => {
    const { root } = widgetRowViewsMock().views.packageToolbar('web', null);
    const container = document.createElement('div');
    const other = document.createElement('button');

    other.focus();
    releaseFocusOf(root, container);

    expect(document.activeElement).toBe(other);
  });
});
