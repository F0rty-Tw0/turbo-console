import type { BoundingBox12, BoundingBoxWH } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { flooredViewportOf } from './floored-viewport.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import type { Size } from '../common/widget.type.ts';

const PADDING_PX = 24;

type Box = BoundingBox12 & BoundingBoxWH;

const box = (x1: number, y1: number, x2: number, y2: number): Box => {
  const bounds: Box = { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };

  return bounds;
};

const size = (width: number, height: number): Size => {
  const canvas: Size = { width, height };

  return canvas;
};

const floorAt = (x: number, y: number): Viewport => {
  const pan: Position = { x, y };
  const viewport: Viewport = { zoom: 0.75, pan };

  return viewport;
};

describe('FEATURE: flooredViewportOf', () => {
  it.each([
    // fit = min(952/4000, 752/3000) = 0.238 → floored; pan.x = 500 − 1800·0.75 = −850; pan.y = 24 − 100·0.75 = −51
    ['a graph that fits at 0.238', box(-200, 100, 3800, 3100), size(1000, 800), floorAt(-850, -51)],
    // tall: fit = min(952/600, 752/2000) = 0.376 (height binds) → pan.x = 500 − 300·0.75 = 275; pan.y = 24 − 0 = 24
    ['a tall graph that fits at 0.376', box(0, 0, 600, 2000), size(1000, 800), floorAt(275, 24)],
    // wide and short: fit = min(952/2000, 752/200) = 0.476 (width binds) → pan.x = 500 − 1000·0.75 = −250; pan.y = 24 + 50·0.75 = 61.5
    ['a wide short graph that fits at 0.476', box(0, -50, 2000, 150), size(1000, 800), floorAt(-250, 61.5)]
  ])('GIVEN %s WHEN the opening viewport is computed THEN it is the floor at the top-centre', (_name, bounds, canvas, expected) => {
    const viewport = flooredViewportOf(bounds, canvas, PADDING_PX);

    expect(viewport).toStrictEqual(expected);
  });

  it.each([
    ['a fit of exactly 0.75', box(0, 0, 1600, 800), size(1248, 1248)],
    ['a fit of 1.5', box(0, 0, 400, 400), size(648, 648)],
    ['a zero-width box taller than the canvas', box(10, 0, 10, 4000), size(1000, 800)],
    ['a zero-height box wider than the canvas', box(0, 10, 4000, 10), size(1000, 800)],
    ['a canvas no wider than twice the padding', box(0, 0, 4000, 3000), size(48, 800)],
    ['a canvas no taller than twice the padding', box(0, 0, 4000, 3000), size(1000, 48)]
  ])('GIVEN %s WHEN the opening viewport is computed THEN it is null, the true fit', (_name, bounds, canvas) => {
    const viewport = flooredViewportOf(bounds, canvas, PADDING_PX);

    expect(viewport).toBeNull();
  });
});
