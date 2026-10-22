import { describe, expect, it } from 'vitest';

import { isLinkKept } from './link-kept.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { GraphLinkRef } from '../../bridge/common/graph-view-state.type.ts';

const EDGES: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: '__proto__', target: 'constructor' }
];

const BOTH: ReadonlySet<string> = new Set(['web', 'ui', '__proto__', 'constructor']);

const NO_UI: ReadonlySet<string> = new Set(['web', '__proto__', 'constructor']);

const NO_WEB: ReadonlySet<string> = new Set(['ui', '__proto__', 'constructor']);

const linkOf = (source: string, target: string): GraphLinkRef => {
  const link: GraphLinkRef = { source, target };

  return link;
};

describe('FEATURE: isLinkKept', () => {
  describe('GIVEN a link, the visible set and the drawn edges', () => {
    it.each([
      { title: 'both ends visible and the edge drawn', link: linkOf('web', 'ui'), visible: BOTH, expected: true },
      { title: 'the target hidden', link: linkOf('web', 'ui'), visible: NO_UI, expected: false },
      { title: 'the source hidden', link: linkOf('web', 'ui'), visible: NO_WEB, expected: false },
      { title: 'the edge drawn only the other way', link: linkOf('ui', 'web'), visible: BOTH, expected: false },
      { title: 'ends named __proto__ and constructor', link: linkOf('__proto__', 'constructor'), visible: BOTH, expected: true }
    ])('WHEN $title THEN it is kept: $expected', ({ link, visible, expected }) => {
      const isKept = isLinkKept(link, visible, EDGES);

      expect(isKept).toBe(expected);
    });
  });
});
