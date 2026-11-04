import type { ElkEdge, ElkEdgeSection, ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position } from '../../../bridge/common/graph-state.type.ts';

const leafOf = (id: string, x: number, y: number): ElkNode => {
  const leaf: ElkNode = { id, x, y, width: 10, height: 10 };

  return leaf;
};

/** An edge routed in root coordinates through one bend. */
const routedEdgeOf = (source: string, target: string, points: [Position, Position, Position]): ElkEdge => {
  const [startPoint, bend, endPoint] = points;
  const section: ElkEdgeSection = { id: `${source}-${target}`, startPoint, bendPoints: [bend], endPoint };
  const edge: ElkEdge = { id: `${source}-${target}`, sources: [source], targets: [target], sections: [section] };

  return edge;
};

const rootOf = (children: ElkNode[], edges: ElkEdge[]): ElkNode => {
  const root: ElkNode = { id: 'root', children, edges };

  return root;
};

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

const T_IN_PACKAGE = leafOf('t', 32, 40);
const PACKAGE_BOX: ElkNode = { id: 'pkg:p', x: 32, y: 32, width: 136, height: 120, children: [T_IN_PACKAGE] };
const FOLDER_BOX: ElkNode = { id: '\u0001f', x: 0, y: 100, width: 200, height: 200, children: [PACKAGE_BOX] };
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
