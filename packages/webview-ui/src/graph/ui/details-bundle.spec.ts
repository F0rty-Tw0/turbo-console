import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bundleView } from './details-bundle.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { BundleDetails } from '../common/details-view.type.ts';
import type { BundleEndModel, BundleViewModel } from '../common/details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

const SOURCE_END: BundleEndModel = { text: 'docs', folder: null };

const TARGET_END: BundleEndModel = { text: 'packages', folder: 'packages' };

const LINKS: GraphEdge[] = [
  { source: 'docs', target: '@acme/ui' },
  { source: 'docs', target: '@acme/utils' }
];

const MODEL: BundleViewModel = { source: SOURCE_END, target: TARGET_END, countText: '2 links', links: LINKS };

const childOf = (view: BundleDetails, className: string): Element | undefined => {
  const children = Array.from(view.root.children);

  return children.find((child) => child.classList.contains(className));
};

const textsOf = (parent: Element | undefined): (string | null)[] => {
  if (parent === undefined) return [];

  const children = Array.from(parent.children);

  return children.map((child): string | null => child.textContent);
};

const rowsOf = (view: BundleDetails): Element[] => {
  const list = childOf(view, 'details-list');

  return Array.from(list?.children ?? []);
};

describe('FEATURE: bundleView', () => {
  let view: BundleDetails;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    view = bundleView(MODEL, false);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the bundle docs to the folder packages with two package links', () => {
    it('WHEN built THEN the root is the bundle view titled "Dependencies"', () => {
      expect(view.root.dataset['view']).toBe('bundle');
      expect(view.heading.textContent).toBe('Dependencies');
    });

    it('WHEN built THEN the lead reads [source] depends on [target] with the two ends as its buttons', () => {
      const lead = childOf(view, 'details-lead');
      const ends = [lead?.children[0], lead?.children[2]];

      expect(textsOf(lead)).toStrictEqual(['docs', ' depends on ', 'packages']);
      expect(ends).toStrictEqual([view.source, view.target]);
    });

    it('WHEN built THEN the heading is described by the lead', () => {
      const lead = childOf(view, 'details-lead');

      expect(lead?.id).toBe('details-bundle-lead');
      expect(view.heading.getAttribute('aria-describedby')).toBe('details-bundle-lead');
    });

    it('WHEN built THEN the muted line is the link count', () => {
      const count = childOf(view, 'details-muted');

      expect(count?.textContent).toBe('2 links');
      expect(count).toBe(view.count);
    });

    it('WHEN built THEN one row per package link reads [source] depends on [target], in order', () => {
      const rows = rowsOf(view);
      const linkTexts = rows.map((row) => textsOf(row.children[0]));
      const ends = view.links.map(({ source, target }) => [source, target]);

      expect(rows).toHaveLength(2);
      expect(linkTexts).toStrictEqual([
        ['docs', ' depends on ', '@acme/ui'],
        ['docs', ' depends on ', '@acme/utils']
      ]);
      expect(ends).toStrictEqual([
        ['docs', '@acme/ui'],
        ['docs', '@acme/utils']
      ]);
    });

    it('WHEN built THEN the folder end is named Folder packages and the package end keeps its name only', () => {
      expect(view.target.textContent).toBe('packages');
      expect(view.target.getAttribute('aria-label')).toBe('Folder packages');
      expect(view.target.title).toBe('Folder packages');
      expect(view.source.getAttribute('aria-label')).toBeNull();
    });

    it('WHEN built THEN the folder end has no data-name and the package end keeps its own', () => {
      expect(view.target.dataset['name']).toBeUndefined();
      expect(view.source.dataset['name']).toBe('docs');
    });

    it('WHEN built THEN each row ends with its Explain button', () => {
      const explains = view.links.map(({ explain }) => explain);
      const lasts = rowsOf(view).map((row) => row.children[1]);

      expect(lasts).toStrictEqual(explains);
      expect(explains.map((explain) => explain.textContent)).toStrictEqual(['Explain', 'Explain']);
    });

    it('WHEN built THEN each Explain names its link by aria-label and title', () => {
      const explains = view.links.map(({ explain }) => explain);
      const labels = explains.map((explain) => explain.getAttribute('aria-label'));
      const titles = explains.map((explain) => explain.title);
      const expected = ['Explain docs → @acme/ui', 'Explain docs → @acme/utils'];

      expect(labels).toStrictEqual(expected);
      expect(titles).toStrictEqual(expected);
    });

    it('WHEN built docked THEN the close button is hidden', () => {
      expect(view.close.hidden).toBe(true);
    });

    it('WHEN built over the canvas THEN the close button shows', () => {
      const overlay = bundleView(MODEL, true);

      expect(overlay.close.hidden).toBe(false);
    });
  });
});
