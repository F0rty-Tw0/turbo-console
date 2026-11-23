import { describe, expect, it } from 'vitest';

import { allDeclarationsOf, css } from './test/utils/graph-css-rules.spec.util.ts';

describe('FEATURE: graph.css list rows', () => {
  describe.each([
    ['package grid', '.controls-row', 'contain-intrinsic-size: auto 24px'],
    ['task Projects grid', '#graph-task-controls .controls-row', 'contain-intrinsic-size: auto 19px']
  ])('GIVEN the %s row rule', (_name, selector, intrinsicSize) => {
    const declarations = allDeclarationsOf(css, selector);

    it('WHEN it is read THEN it skips rows away from the viewport', () => {
      expect(declarations).toContain('content-visibility: auto');
    });

    it(`WHEN it is read THEN it holds ${intrinsicSize}`, () => {
      expect(declarations).toContain(intrinsicSize);
    });
  });
});
