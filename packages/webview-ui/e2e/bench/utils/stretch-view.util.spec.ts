import { describe, expect, it } from 'vitest';

import {
  dragRegionOf,
  extentOf,
  fitNoteOf,
  isCentred,
  isPointInside,
  nodeNamed,
  offsetToCentre,
  panStepOf
} from './stretch-view.util.ts';
import type { ElementRect } from '../../common/playwright.type.ts';
import { insideFlagsOf, nodeAt } from '../../test/utils/graph-geometry.spec.util.ts';
import type { StretchExtent, StretchFit } from '../common/bench.type.ts';

const CONTAINER: ElementRect = { left: 0, top: 0, width: 1280, height: 720 };

describe('FEATURE: stretch view geometry', () => {
  describe('GIVEN nodes spread over a tall column', () => {
    it('WHEN the extent is taken THEN it spans the model centres on each axis', () => {
      const nodes = [nodeAt('a', 222, 60), nodeAt('b', 2215, 77854), nodeAt('c', 900, 5000)];

      const extent = extentOf(nodes);

      expect(extent).toStrictEqual({ width: 1993, height: 77794 });
    });

    it('WHEN no node is drawn THEN taking the extent throws', () => {
      expect(() => extentOf([])).toThrow('no node to measure');
    });
  });

  describe('GIVEN drawn nodes', () => {
    it('WHEN one is looked up by id THEN that node is returned', () => {
      const nodes = [nodeAt('a', 1, 1), nodeAt('b', 2, 2)];

      const node = nodeNamed(nodes, 'b');

      expect(node.renderedX).toBe(2);
    });

    it('WHEN the id is not drawn THEN the lookup throws', () => {
      expect(() => nodeNamed([nodeAt('a', 1, 1)], 'b')).toThrow('b is not drawn');
    });
  });

  describe('GIVEN a fit', () => {
    it('WHEN it is worded THEN the zoom has 3 decimals and the extent is rounded to whole pixels', () => {
      const extent: StretchExtent = { width: 1992.6, height: 77794.2 };
      const fit: StretchFit = { zoom: 0.05, extent };

      const note = fitNoteOf(fit);

      expect(note).toBe('stretch fit zoom 0.050 extent 1993x77794');
    });
  });

  describe('GIVEN a node right of and below the container centre', () => {
    it('WHEN its offset to the centre is taken THEN it points up and left', () => {
      const node = nodeAt('umbrella', 840, 460);

      const offset = offsetToCentre(node, CONTAINER);

      expect(offset).toStrictEqual({ x: -200, y: -100 });
    });
  });

  describe('GIVEN an offset', () => {
    it('WHEN it is 40 px or less THEN it is centred', () => {
      expect(isCentred({ x: 24, y: -32 })).toBe(true);
    });

    it('WHEN it is past 40 px THEN it is not centred', () => {
      expect(isCentred({ x: 30, y: 30 })).toBe(false);
    });
  });

  describe('GIVEN an offset past the viewport', () => {
    it('WHEN the pan step is taken THEN each axis is cut to half the container, keeping its sign', () => {
      const step = panStepOf({ x: -3000, y: 1500 }, CONTAINER);

      expect(step).toStrictEqual({ x: -640, y: 360 });
    });

    it('WHEN the offset is already short THEN the step is the offset', () => {
      const step = panStepOf({ x: 100, y: -50 }, CONTAINER);

      expect(step).toStrictEqual({ x: 100, y: -50 });
    });
  });

  describe('GIVEN a drag by a step', () => {
    it('WHEN the step goes right and down THEN the start region leaves room on the right and bottom', () => {
      const region = dragRegionOf(CONTAINER, { x: 120, y: 120 });

      expect(region).toStrictEqual({ left: 4, top: 4, width: 1152, height: 592 });
    });

    it('WHEN the step goes left and up THEN the start region leaves room on the left and top', () => {
      const region = dragRegionOf(CONTAINER, { x: -100, y: -50 });

      expect(region).toStrictEqual({ left: 104, top: 54, width: 1172, height: 662 });
    });
  });

  describe('GIVEN a point', () => {
    it('WHEN it lies in the container THEN it is inside', () => {
      expect(isPointInside({ x: 640, y: 360 }, CONTAINER)).toBe(true);
    });

    it('WHEN it lies below the container THEN it is not inside', () => {
      expect(isPointInside({ x: 640, y: 721 }, CONTAINER)).toBe(false);
    });

    it('WHEN it lies on the top or left edge THEN it is inside', () => {
      expect(isPointInside({ x: 0, y: 360 }, CONTAINER)).toBe(true);
      expect(isPointInside({ x: 640, y: 0 }, CONTAINER)).toBe(true);
    });

    it('WHEN it lies on the bottom or right edge THEN it is inside', () => {
      expect(isPointInside({ x: 1280, y: 360 }, CONTAINER)).toBe(true);
      expect(isPointInside({ x: 640, y: 720 }, CONTAINER)).toBe(true);
    });

    it('WHEN it lies right of or above the container THEN it is not inside', () => {
      expect(isPointInside({ x: 1281, y: 360 }, CONTAINER)).toBe(false);
      expect(isPointInside({ x: 640, y: -1 }, CONTAINER)).toBe(false);
    });
  });

  describe('GIVEN one node wholly in the container and one half out of it', () => {
    it('WHEN the inside flags are taken THEN only the first is true', () => {
      const nodes = [nodeAt('in', 100, 100), nodeAt('edge', 10, 100)];

      const flags = insideFlagsOf(CONTAINER, nodes, 1);

      expect(flags).toStrictEqual([true, false]);
    });
  });
});
