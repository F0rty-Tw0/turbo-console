import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { U0Canvas } from '../common/u0-workspace.type.ts';
import { boxOf, leafOf, rootOf, routedEdgeOf } from '../utils/layout-nodes.spec.util.ts';

const FOREIGN_BOX_RECT = { x: -20, y: 40, width: 60, height: 50 };

/** `a → d` runs straight down through the title band and the body of `pkg:f`, a box that holds neither end. */
export const FOREIGN_BAND_STUB: ElkNode = rootOf(
  [leafOf('a', 0, 0), leafOf('d', 0, 100), boxOf('pkg:f', FOREIGN_BOX_RECT, [leafOf('f1', 30, 10)])],
  [
    routedEdgeOf('a', 'd', [
      { x: 5, y: 10 },
      { x: 5, y: 55 },
      { x: 5, y: 100 }
    ])
  ]
);

const TALL_BOX_RECT = { x: -20, y: 40, width: 60, height: 100 };

/** `p → q` runs along `y = 105`, through the body of `pkg:g` below its title band (`y` 40 to 72), a box that holds neither end. */
export const FOREIGN_BODY_STUB: ElkNode = rootOf(
  [leafOf('p', -60, 100), leafOf('q', 60, 100), boxOf('pkg:g', TALL_BOX_RECT, [leafOf('g1', 30, 10)])],
  [
    routedEdgeOf('p', 'q', [
      { x: -50, y: 105 },
      { x: 0, y: 105 },
      { x: 60, y: 105 }
    ])
  ]
);

const LEFT_BOX_RECT = { x: 0, y: 0, width: 100, height: 100 };
const RIGHT_BOX_RECT = { x: 50, y: 50, width: 100, height: 100 };

/** Two sibling boxes whose rects overlap in a 50 × 50 square. */
export const OVERLAPPING_BOXES_STUB: ElkNode = rootOf(
  [boxOf('pkg:l', LEFT_BOX_RECT, [leafOf('l1', 10, 10)]), boxOf('pkg:r', RIGHT_BOX_RECT, [leafOf('r1', 10, 10)])],
  []
);

const OUTER_BOX_RECT = { x: 0, y: 0, width: 200, height: 200 };
const INNER_BOX_RECT = { x: 20, y: 20, width: 100, height: 100 };
const INNER_BOX = boxOf('pkg:in', INNER_BOX_RECT, [leafOf('i1', 10, 10)]);

/** A box inside another: their rects overlap, but one holds the other. */
export const NESTED_BOXES_STUB: ElkNode = rootOf([boxOf('pkg:out', OUTER_BOX_RECT, [INNER_BOX])], []);

const FIT_BOX_RECT = { x: 0, y: 0, width: 100, height: 50 };

/**
 * `s → t` bends out to `x = 121.5`. With the drawn box (the 1.5 px border grows it to -1.5 … 101.5 by -1.5 … 51.5), the
 * bounds run -1.5 … 121.5 across and -1.5 … 70 down: 123 × 71.5.
 */
export const FIT_BOUNDS_STUB: ElkNode = rootOf(
  [leafOf('s', 10, 60), boxOf('pkg:p', FIT_BOX_RECT, [leafOf('t', 10, 10)])],
  [
    routedEdgeOf('s', 't', [
      { x: 15, y: 60 },
      { x: 121.5, y: 65 },
      { x: 15, y: 20 }
    ])
  ]
);

/** A canvas 171 px wide: minus the 24 px margins that is 123 px, the width of `FIT_BOUNDS_STUB`, so the fit zoom is 1. */
export const FIT_CANVAS_STUB: U0Canvas = { width: 171, height: 500 };
