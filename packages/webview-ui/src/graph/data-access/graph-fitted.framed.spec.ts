import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFittedCamera } from './graph-fitted.ts';
import { graphStyleOf } from './graph-style.ts';
import { fitVisible, framedOf, openViewportOf } from './graph-visibility.ts';
import type * as visibility from './graph-visibility.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { largeGroupedElementsOf } from '../test/utils/open-scenes.spec.util.ts';

vi.mock('./graph-visibility.ts', async (importOriginal) => {
  const real = await importOriginal<typeof visibility>();
  const spied = { framedOf: vi.fn(real.framedOf), openViewportOf: vi.fn(real.openViewportOf), fitVisible: vi.fn(real.fitVisible) };
  const mocked = { ...real, ...spied };

  return mocked;
});

/** Above the floor at this size, so open runs the true fit after reading the floored viewport. */
const TARGET_LIKE_COUNT = 14;

describe('FEATURE: createFittedCamera reads the framed set once per frame', () => {
  let cy: Core;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };
    const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

    cy = cytoscape({ headless: true, styleEnabled: true, layout, style, elements: largeGroupedElementsOf(TARGET_LIKE_COUNT) });
    vi.spyOn(cy, 'width').mockReturnValue(2400);
    vi.spyOn(cy, 'height').mockReturnValue(1600);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a graph that fits above the floor', () => {
    it('WHEN the camera opens THEN the framed set is built once for both the floor check and the fit', () => {
      createFittedCamera(cy, { onViewport: vi.fn(), onRefit: vi.fn() }).open();

      expect(framedOf).toHaveBeenCalledTimes(1);
    });

    it('WHEN the camera opens THEN the fit gets the framed set the floor check measured', () => {
      createFittedCamera(cy, { onViewport: vi.fn(), onRefit: vi.fn() }).open();

      const [, , measured] = vi.mocked(openViewportOf).mock.calls[0] ?? [];
      const [, , fitted] = vi.mocked(fitVisible).mock.calls[0] ?? [];

      expect(measured).toBeDefined();
      expect(fitted).toBe(measured);
    });
  });
});
