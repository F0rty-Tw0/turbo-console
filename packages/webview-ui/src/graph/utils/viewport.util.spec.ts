import { describe, expect, it } from 'vitest';

import { isSameViewport } from './viewport.util.ts';
import type { Viewport } from '../common/graph-page.type.ts';

const viewportOf = (zoom: number, x: number, y: number): Viewport => {
  const pan = { x, y };
  const viewport: Viewport = { zoom, pan };

  return viewport;
};

const CAMERA = viewportOf(1, 10, 20);

describe('FEATURE: isSameViewport', () => {
  describe('GIVEN a camera at zoom 1 panned to 10, 20', () => {
    it.each([
      { title: 'the same camera', other: viewportOf(1, 10, 20), expected: true },
      { title: 'another zoom', other: viewportOf(1.1, 10, 20), expected: false },
      { title: 'another pan x', other: viewportOf(1, 11, 20), expected: false },
      { title: 'another pan y', other: viewportOf(1, 10, 21), expected: false }
    ])('WHEN it is compared with $title THEN same is $expected', ({ other, expected }) => {
      const isSame = isSameViewport(CAMERA, other);

      expect(isSame).toBe(expected);
    });
  });
});
