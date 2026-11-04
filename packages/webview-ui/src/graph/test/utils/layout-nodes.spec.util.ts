import type { ElkEdge, ElkEdgeSection, ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position } from '../../../bridge/common/graph-state.type.ts';

/** A 10 × 10 leaf at `x`, `y` in its parent. */
export const leafOf = (id: string, x: number, y: number): ElkNode => {
  const leaf: ElkNode = { id, x, y, width: 10, height: 10 };

  return leaf;
};

/** A box at `x`, `y` in its parent, holding `children`. */
export const boxOf = (id: string, rect: Pick<ElkNode, 'x' | 'y' | 'width' | 'height'>, children: ElkNode[]): ElkNode => {
  const box: ElkNode = { id, ...rect, children };

  return box;
};

/** An edge routed in root coordinates through one bend. */
export const routedEdgeOf = (source: string, target: string, points: [Position, Position, Position]): ElkEdge => {
  const [startPoint, bend, endPoint] = points;
  const section: ElkEdgeSection = { id: `${source}-${target}`, startPoint, bendPoints: [bend], endPoint };
  const edge: ElkEdge = { id: `${source}-${target}`, sources: [source], targets: [target], sections: [section] };

  return edge;
};

/** A laid-out root holding `children` and `edges`. */
export const rootOf = (children: ElkNode[], edges: ElkEdge[]): ElkNode => {
  const root: ElkNode = { id: 'root', children, edges };

  return root;
};
