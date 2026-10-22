import { describe, expect, it } from 'vitest';

import { flatElkGraphOf } from './elk-flat-graph.util.ts';
import { elkGraphOf } from './elk-graph.util.ts';
import { BOARDS_SIZE_STUB } from '../test/stubs/folder-boards.stub.ts';
import { boardsGraphOf, boardsSizeOf, childrenOf, idsOf } from '../test/utils/folder-boards.spec.util.ts';

describe('FEATURE: flatElkGraphOf', () => {
  describe('GIVEN the grouped boards graph', () => {
    const grouped = boardsGraphOf();

    it('WHEN flattened THEN the children are the five package leaves in order', () => {
      const flat = flatElkGraphOf(grouped);
      const [first] = childrenOf(flat);

      expect(idsOf(childrenOf(flat))).toStrictEqual(['docs', 'web', '@acme/config', '@acme/ui', '@acme/utils']);
      expect(first).toStrictEqual({ id: 'docs', ...BOARDS_SIZE_STUB });
    });

    it('WHEN flattened THEN the root keeps its edges, options and id', () => {
      const flat = flatElkGraphOf(grouped);

      expect(flat.edges).toStrictEqual(grouped.edges);
      expect(flat.layoutOptions).toStrictEqual(grouped.layoutOptions);
      expect(flat.id).toBe('root');
    });

    it('WHEN flattened THEN no compound id remains', () => {
      const flat = flatElkGraphOf(grouped);
      const ids = idsOf(childrenOf(flat));
      const compoundIds = ids.filter((id) => id.startsWith('\u0001'));

      expect(compoundIds).toStrictEqual([]);
    });
  });

  it('GIVEN an already flat graph WHEN flattened THEN it comes back equal', () => {
    const flat = elkGraphOf(['a', 'b'], [{ source: 'a', target: 'b' }], boardsSizeOf);

    const flattened = flatElkGraphOf(flat);

    expect(flattened).toStrictEqual(flat);
  });

  it('GIVEN an empty graph WHEN flattened THEN it has no children', () => {
    const empty = elkGraphOf([], [], boardsSizeOf);

    const flattened = flatElkGraphOf(empty);

    expect(flattened.children).toStrictEqual([]);
  });
});
