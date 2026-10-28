import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildLocation, renderLocation, renderLocationLines } from './location-elements.ts';
import type { LocationBarElements, LocationCrumb } from '../common/location.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const crumbOf = (kind: LocationCrumb['kind'], label: string, isCurrent: boolean): LocationCrumb => {
  const crumb: LocationCrumb = { kind, label, name: label, isCurrent };

  return crumb;
};

const PACKAGES = crumbOf('packages', 'Packages', false);
const APP = crumbOf('package', 'app', false);
const TASKS = crumbOf('tasks', 'Tasks (2)', true);
const TASK_TRAIL: LocationCrumb[] = [PACKAGES, APP, TASKS];
const FOUR_LINES = ['3 links with a not shown', '3 links with b not shown', '2 links with c not shown', 'and 2 more folders'];

const isHtmlElement = (element: Element | undefined): element is HTMLElement => element !== undefined && 'dataset' in element;

/** The button or text inside the crumb list's `index`th item. */
const crumbAt = (elements: LocationBarElements, index: number): HTMLElement | undefined => {
  const item = elements.crumbs.children[index];
  const crumb = item?.children[0];

  return isHtmlElement(crumb) ? crumb : undefined;
};

/** The text of a line's last child, its label after any icon. */
const lastTextOf = (item: Element): string | null | undefined => {
  const children = Array.from(item.children);

  return children.pop()?.textContent;
};

describe('FEATURE: location bar elements', () => {
  let elements: LocationBarElements;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    elements = buildLocation();
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a new bar', () => {
    it('WHEN built THEN it is a hidden nav named Graph location holding the crumb list, then the lines list', () => {
      const children = Array.from(elements.nav.children);

      expect(elements.nav).toMatchObject({ tagName: 'NAV', className: 'graph-location', hidden: true });
      expect(elements.nav.getAttribute('aria-label')).toBe('Graph location');
      expect(children).toStrictEqual([elements.crumbs, elements.lines]);
      expect([elements.crumbs.tagName, elements.lines.tagName]).toStrictEqual(['OL', 'UL']);
    });
  });

  describe('GIVEN the trail Packages, app, Tasks (2)', () => {
    it('WHEN rendered THEN the last crumb is text with aria-current=page, the others are buttons with title and aria-label', () => {
      renderLocation(elements, TASK_TRAIL, [], vi.fn());

      const packages = crumbAt(elements, 0);
      const current = crumbAt(elements, 2);

      expect(elements.crumbs.children).toHaveLength(3);
      expect(packages).toMatchObject({ tagName: 'BUTTON', className: 'details-name', type: 'button', title: 'Packages' });
      expect(packages?.getAttribute('aria-label')).toBe('Packages');
      expect(current).toMatchObject({ tagName: 'SPAN', className: 'location-current', textContent: 'Tasks (2)', tabIndex: -1 });
      expect(current?.getAttribute('aria-current')).toBe('page');
    });

    it('WHEN the app crumb is clicked THEN press gets the app crumb', () => {
      const press = vi.fn();

      renderLocation(elements, TASK_TRAIL, [], press);
      crumbAt(elements, 1)?.click();

      expect(press).toHaveBeenCalledExactlyOnceWith(APP);
    });

    it('WHEN rendered with no lines THEN the lines list is hidden and empty', () => {
      renderLocation(elements, TASK_TRAIL, [], vi.fn());

      expect(elements.lines).toMatchObject({ hidden: true, children: [] });
    });
  });

  describe('GIVEN four line texts', () => {
    it('WHEN rendered THEN four lines show, the first three with the info icon and the last without', () => {
      renderLocation(elements, [PACKAGES], FOUR_LINES, vi.fn());

      const items = Array.from(elements.lines.children);
      const texts = items.map(lastTextOf);
      const icons = items.map((item) => item.children.length === 2);

      expect(elements.lines.hidden).toBe(false);
      expect(texts).toStrictEqual(FOUR_LINES);
      expect(icons).toStrictEqual([true, true, true, false]);
    });
  });

  describe('GIVEN focus on a crumb button', () => {
    it('WHEN the bar is rebuilt THEN focus lands on the new current crumb', () => {
      renderLocation(elements, TASK_TRAIL, [], vi.fn());
      crumbAt(elements, 0)?.focus();
      renderLocation(elements, [crumbOf('packages', 'Packages', true)], [], vi.fn());

      expect(document.activeElement).toBe(crumbAt(elements, 0));
    });
  });

  describe('GIVEN focus on a crumb button over four lines', () => {
    beforeEach((): void => {
      renderLocation(elements, [PACKAGES, TASKS], FOUR_LINES, vi.fn());
      crumbAt(elements, 0)?.focus();
    });

    it('WHEN only the lines are replaced THEN the same crumb keeps focus and the new line shows', () => {
      const focused = crumbAt(elements, 0);

      renderLocationLines(elements, ['1 link with a not shown']);

      const texts = Array.from(elements.lines.children, lastTextOf);

      expect(crumbAt(elements, 0)).toBe(focused);
      expect(document.activeElement).toBe(focused);
      expect(texts).toStrictEqual(['1 link with a not shown']);
    });

    it('WHEN the lines are replaced by none THEN the lines list is hidden and empty', () => {
      renderLocationLines(elements, []);

      expect(elements.lines).toMatchObject({ hidden: true, children: [] });
    });
  });

  describe('GIVEN focus outside the bar', () => {
    it('WHEN the bar is rebuilt THEN focus stays where it was', () => {
      const outside = document.createElement('button');

      outside.focus();
      renderLocation(elements, TASK_TRAIL, [], vi.fn());

      expect(document.activeElement).toBe(outside);
    });
  });
});
