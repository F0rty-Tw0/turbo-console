import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { boxOf, leafOf, rootOf, routedEdgeOf } from '../utils/layout-nodes.spec.util.ts';

const A = leafOf('a', 0, 0);
const B = leafOf('b', 100, 100);
const C = leafOf('c', 100, 0);
const D = leafOf('d', 0, 100);

/** `a → b` and `c → d`, each through one bend, crossing once; no end shared. */
export const CROSSING_ROUTES_STUB: ElkNode = rootOf(
  [A, B, C, D],
  [
    routedEdgeOf('a', 'b', [
      { x: 5, y: 10 },
      { x: 55, y: 55 },
      { x: 105, y: 100 }
    ]),
    routedEdgeOf('c', 'd', [
      { x: 105, y: 10 },
      { x: 55, y: 45 },
      { x: 5, y: 100 }
    ])
  ]
);

/** `a → b` and `a → d` leave the same node, each through one bend, and cross below it. */
export const SHARED_END_ROUTES_STUB: ElkNode = rootOf(
  [A, B, D],
  [
    routedEdgeOf('a', 'b', [
      { x: 5, y: 10 },
      { x: 25, y: 20 },
      { x: 105, y: 100 }
    ]),
    routedEdgeOf('a', 'd', [
      { x: 6, y: 10 },
      { x: 6, y: 25 },
      { x: 5, y: 100 }
    ])
  ]
);

/** `a → d` runs straight down through `x`, a third leaf half way. */
export const THROUGH_LEAF_STUB: ElkNode = rootOf(
  [A, D, leafOf('x', 0, 50)],
  [
    routedEdgeOf('a', 'd', [
      { x: 5, y: 10 },
      { x: 5, y: 55 },
      { x: 5, y: 100 }
    ])
  ]
);

/**
 * `a → d` runs straight down along `x = 1`, the left edge of `x`, a third leaf: its half-length point is inside `x`, but
 * the route stays out of `x` shrunk by 2 px.
 */
export const MIDPOINT_UNDER_STUB: ElkNode = rootOf(
  [A, D, leafOf('x', 0, 50)],
  [
    routedEdgeOf('a', 'd', [
      { x: 1, y: 10 },
      { x: 1, y: 55 },
      { x: 1, y: 100 }
    ])
  ]
);

const T_IN_PACKAGE = leafOf('t', 32, 40);
const PACKAGE_BOX = boxOf('pkg:p', { x: 32, y: 32, width: 136, height: 120 }, [T_IN_PACKAGE]);
const FOLDER_BOX = boxOf('\u0001f', { x: 0, y: 100, width: 200, height: 200 }, [PACKAGE_BOX]);
const S_ABOVE = leafOf('s', 64, 0);

/** `s → t` comes down into `t` through the title bands of its own package box and of that box's folder. */
export const OWN_BANDS_STUB: ElkNode = rootOf(
  [S_ABOVE, FOLDER_BOX],
  [
    routedEdgeOf('s', 't', [
      { x: 69, y: 10 },
      { x: 69, y: 100 },
      { x: 69, y: 172 }
    ])
  ]
);
