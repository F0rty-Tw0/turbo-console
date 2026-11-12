import { describe, expect, it } from 'vitest';

import { chipRowTransformOf } from './atom-chip-transform.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

describe('FEATURE: chipRowTransformOf', () => {
  describe('GIVEN an umbrella’s model centre, its width and the viewport', () => {
    it.each([
      { cx: 100, cy: 50, width: 200, px: 10, py: 20, zoom: 2, expected: 'translate(10px, 120px) scale(2)' },
      { cx: 0, cy: 0, width: 100, px: 0, py: 0, zoom: 1, expected: 'translate(-50px, 0px) scale(1)' },
      { cx: 200, cy: 100, width: 80, px: -30, py: 5, zoom: 0.5, expected: 'translate(50px, 55px) scale(0.5)' }
    ])('WHEN centre ($cx, $cy) width $width pan ($px, $py) zoom $zoom THEN the transform is $expected', (row) => {
      const { cx, cy, width, px, py, zoom, expected } = row;
      const centre: Position = { x: cx, y: cy };
      const pan: Position = { x: px, y: py };
      const transform = chipRowTransformOf(centre, width, pan, zoom);

      expect(transform).toBe(expected);
    });
  });
});
