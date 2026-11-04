import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { sizeOf } from './elk-options.spec.util.ts';
import { scriptOf, taskOf } from './shown-set.spec.util.ts';
import type { GraphEdge, GraphTask, Position, Positions, Routes } from '../../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';
import { edgeIdOf } from '../../utils/edge-id.util.ts';
import { nestedCentresOf } from '../../utils/elk-centres.util.ts';
import { elkTaskGraphOf } from '../../utils/elk-task-graph.util.ts';
import { NAMING_STUB } from '../stubs/graph-task.stub.ts';

/** Two components: a script of web (apps) needing a task of ui (packages), and a task of cli (tools) needing another of cli. */
const PACKED_LINKS: GraphEdge[] = [
  { source: 'web#lint-fix', target: 'ui#build' },
  { source: 'cli#test', target: 'cli#build' }
];

const FOLDERS = new Map([
  ['web', 'apps'],
  ['ui', 'packages'],
  ['cli', 'tools']
]);

const TASKS: GraphTask[] = [
  scriptOf('web#lint-fix', ['ui#build']),
  taskOf('ui#build', []),
  taskOf('cli#test', ['cli#build']),
  taskOf('cli#build', [])
];

/** The grouped task ELK input of `PACKED_LINKS`: two wrappers under the packed root. */
export const packedTaskGraphOf = (): ElkNode => {
  const shown = new Set(TASKS.map((task) => task.id));
  const naming = { ...NAMING_STUB, grouped: true, folders: FOLDERS };
  const request = { tasks: TASKS, shown, sizes: new Map<string, NodeSize>(), titleWidths: new Map<string, number>(), naming };

  return elkTaskGraphOf(request, sizeOf);
};

/** The edge ids of `PACKED_LINKS`. */
export const packedEdgeIds = (): string[] => PACKED_LINKS.map(edgeIdOf);

const GAP_DIGITS = 6;

/** The distance from `point` to the box of `sizeOf` around `centre`, rounded to 1e-6 px so float noise on the box edge reads 0. */
const gapToBox = (point: Position, centre: Position): number => {
  const { width, height } = sizeOf();
  const gapX = Math.max(Math.abs(point.x - centre.x) - width / 2, 0);
  const gapY = Math.max(Math.abs(point.y - centre.y) - height / 2, 0);
  const gap = Math.hypot(gapX, gapY);

  return Number(gap.toFixed(GAP_DIGITS));
};

/** Per link of `PACKED_LINKS`, how far its route starts from its source box, in the laid-out graph's root coordinates; NaN with no route. */
export const startGapsOf = (laidOut: ElkNode, routes: Routes): number[] => {
  const centres: Positions = nestedCentresOf(laidOut);
  const gapOf = (link: GraphEdge): number => {
    const start = routes[edgeIdOf(link)]?.start;
    const centre = centres[link.source];

    if (start === undefined || centre === undefined) return NaN;

    return gapToBox(start, centre);
  };

  return PACKED_LINKS.map(gapOf);
};
