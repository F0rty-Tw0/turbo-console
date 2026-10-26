import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { linkView } from './details-link.ts';
import type { LinkDetails } from '../common/details-view.type.ts';
import type { LinkViewModel } from '../common/details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { namesIn } from '../test/utils/details-names.spec.util.ts';

const MODEL: LinkViewModel = { source: '@acme/web', target: '@acme/ui', file: 'apps/web/package.json' };

const leadOf = (view: LinkDetails): Element | undefined => {
  const children = Array.from(view.root.children);

  return children.find((child) => child.classList.contains('details-lead'));
};

const textsOf = (parent: Element | undefined): (string | null)[] => {
  if (parent === undefined) return [];

  const children = Array.from(parent.children);

  return children.map((child): string | null => child.textContent);
};

describe('FEATURE: linkView', () => {
  let view: LinkDetails;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    view = linkView(MODEL, false);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the link @acme/web to @acme/ui', () => {
    it('WHEN built THEN each package name is a button exactly once', () => {
      const names = namesIn(view.root);

      expect(names).toStrictEqual(['@acme/web', '@acme/ui']);
    });

    it('WHEN built THEN one line reads [source] depends on [target] with the two buttons inline', () => {
      const lead = leadOf(view);
      const ends = [lead?.children[0], lead?.children[2]];

      expect(textsOf(lead)).toStrictEqual(['@acme/web', ' depends on ', '@acme/ui']);
      expect(ends).toStrictEqual([view.source, view.target]);
    });

    it('WHEN built THEN the heading is "Dependency"', () => {
      expect(view.heading.textContent).toBe('Dependency');
    });

    it('WHEN built THEN the heading is described by the lead line that names the two ends', () => {
      const describedBy = view.heading.getAttribute('aria-describedby');
      const children = Array.from(view.root.children);
      const described = children.find((child) => child.id === describedBy);

      expect(described).toBe(leadOf(view));
      expect(textsOf(described)).toStrictEqual(['@acme/web', ' depends on ', '@acme/ui']);
    });
  });
});
