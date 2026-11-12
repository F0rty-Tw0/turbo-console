import type { AtomChipsPort } from './atom-chips.type.ts';
import type { TaskView } from './graph-task.type.ts';
import type { LayoutResult } from './layout.type.ts';
import type { NodeSize } from './node-size.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphEdge, Positions } from '../../bridge/common/graph-state.type.ts';

/** The placed task layout's node centres the Atomizer groups expand from. */
export type AtomLayout = Pick<LayoutResult, 'positions'>;

/**
 * What `GraphAtomGroups` reads and writes: the task canvas, the group canvas and the camera, the bridge for
 * `shownUmbrellas`, the clock, and the layer and builder of the umbrellas' chip rows.
 */
export type AtomGroupsDeps = {
  readonly view: Pick<TaskView, 'tasks' | 'atoms' | 'viewport'>;
  readonly chips: AtomChipsPort;
  readonly bridge: Pick<Bridge, 'post'>;
  readonly now: () => number;
};

/**
 * The last placed task layout an Atomizer group is read against: the umbrellas shown, their base centres and sizes, their
 * package boxes, and the links between the drawn tasks.
 */
export type AtomPlacement = {
  readonly shown: ReadonlySet<string>;
  readonly base: Positions;
  readonly sizes: ReadonlyMap<string, NodeSize>;
  readonly pkgBoxes: ReadonlyMap<string, string>;
  readonly links: GraphEdge[];
};
