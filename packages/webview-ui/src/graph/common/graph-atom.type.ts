import type { TaskView } from './graph-task.type.ts';
import type { LayoutResult } from './layout.type.ts';
import type { NodeSize } from './node-size.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphEdge, Positions, Routes } from '../../bridge/common/graph-state.type.ts';

/** The placed task layout's node centres and link routes the Atomizer groups expand from. */
export type AtomLayout = Pick<LayoutResult, 'positions' | 'routes'>;

/** What `GraphAtomGroups` reads and writes: the task canvas, the group canvas, the bridge for `shownUmbrellas`, and the clock. */
export type AtomGroupsDeps = {
  readonly view: Pick<TaskView, 'tasks' | 'atoms'>;
  readonly bridge: Pick<Bridge, 'post'>;
  readonly now: () => number;
};

/**
 * The last placed task layout an Atomizer group is read against: the umbrellas shown, their base centres and sizes, their
 * package boxes, the links between the drawn tasks, and the base route of each link that has one.
 */
export type AtomPlacement = {
  readonly shown: ReadonlySet<string>;
  readonly base: Positions;
  readonly sizes: ReadonlyMap<string, NodeSize>;
  readonly pkgBoxes: ReadonlyMap<string, string>;
  readonly links: GraphEdge[];
  readonly routes: Routes;
};
