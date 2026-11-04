import type { BoundingBox12 } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { unionBoxOf } from './folder-box.util.ts';

const LEFT_BOX: BoundingBox12 = { x1: -50, y1: 0, x2: 50, y2: 32 };

const LOWER_RIGHT_BOX: BoundingBox12 = { x1: 70, y1: 284, x2: 170, y2: 316 };

describe('FEATURE: unionBoxOf', () => {
  it('GIVEN two boxes apart WHEN they are joined THEN the union spans both', () => {
    const union = unionBoxOf([LEFT_BOX, LOWER_RIGHT_BOX]);

    expect(union).toStrictEqual({ x1: -50, y1: 0, x2: 170, y2: 316 });
  });

  it('GIVEN one box WHEN it is joined THEN the union is that box', () => {
    const union = unionBoxOf([LOWER_RIGHT_BOX]);

    expect(union).toStrictEqual(LOWER_RIGHT_BOX);
  });

  it('GIVEN no box WHEN they are joined THEN there is no union', () => {
    const union = unionBoxOf([]);

    expect(union).toBeNull();
  });
});
