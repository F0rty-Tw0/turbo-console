import { describe, expect, it } from 'vitest';

import { sashDragWidthOf, sashKeyWidthOf } from './sash-input.util.ts';

const MAX_PX = 580;

describe('FEATURE: sashKeyWidthOf', () => {
  it.each([
    ['controls', 'ArrowRight', 260, 276],
    ['controls', 'ArrowLeft', 260, 244],
    ['details', 'ArrowLeft', 280, 296],
    ['details', 'ArrowRight', 280, 264],
    ['controls', 'Home', 260, 200],
    ['details', 'Home', 280, 200],
    ['controls', 'End', 260, MAX_PX],
    ['details', 'End', 280, MAX_PX],
    ['controls', 'ArrowUp', 260, null],
    ['details', 'ArrowDown', 280, null],
    ['details', 'Enter', 280, null],
    ['controls', 'Tab', 260, null]
  ] as const)('GIVEN the %s sash WHEN %s at %i THEN %j', (side, key, current, expected) => {
    const width = sashKeyWidthOf(side, key, current, MAX_PX);

    expect(width).toBe(expected);
  });
});

describe('FEATURE: sashDragWidthOf', () => {
  it('GIVEN a pointer 300px right of the body edge WHEN the Controls width is read THEN it is 300', () => {
    const width = sashDragWidthOf('controls', 400, { left: 100, right: 1280 });

    expect(width).toBe(300);
  });

  it('GIVEN a pointer 380px left of the body edge WHEN the Details width is read THEN it is 380', () => {
    const width = sashDragWidthOf('details', 900, { left: 0, right: 1280 });

    expect(width).toBe(380);
  });

  it('GIVEN a pointer between pixels WHEN the width is read THEN it is rounded', () => {
    const width = sashDragWidthOf('controls', 300.6, { left: 0, right: 1280 });

    expect(width).toBe(301);
  });
});
