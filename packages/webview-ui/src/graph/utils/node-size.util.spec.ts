import { describe, expect, it } from 'vitest';

import { nodeSizeOf } from './node-size.util.ts';

describe('FEATURE: nodeSizeOf', () => {
  describe.each([
    [100, { width: 124, height: 32 }],
    [0, { width: 24, height: 32 }]
  ])('GIVEN a label %s px wide', (textWidth, size) => {
    it('WHEN sized THEN padding is added to the width', () => {
      const nodeSize = nodeSizeOf(textWidth);

      expect(nodeSize).toStrictEqual(size);
    });
  });
});
