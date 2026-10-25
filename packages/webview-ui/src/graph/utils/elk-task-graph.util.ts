import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { edgeIdOf } from './edge-id.util.ts';
import { COMPOUND_OPTIONS, elkEdgeOf } from './elk-grouped-graph.util.ts';
import type { GraphEdge, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { TASK_BOX_PREFIX } from '../common/graph-task.const.ts';
import { ELK_GROUPED_ROOT_OPTIONS } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

/** The compound id of a task's package; the root package `//` gives `pkg://`. */
export const taskBoxIdOf = (packageName: string): string => `${TASK_BOX_PREFIX}${packageName}`;

/** The links from each shown task to each shown dependency, `source` the dependent. */
export const taskEdgesOf = (tasks: GraphTask[], shown: ReadonlySet<string>): GraphEdge[] => {
  const drawn = tasks.filter((task) => shown.has(task.id));
  const edgesOf = (task: GraphTask): GraphEdge[] => {
    const needed = task.dependencies.filter((id) => shown.has(id));

    const edgeTo = (target: string): GraphEdge => {
      const edge: GraphEdge = { source: task.id, target };

      return edge;
    };

    return needed.map(edgeTo);
  };

  return drawn.flatMap(edgesOf);
};

const sortedPackagesOf = (tasks: GraphTask[]): string[] => {
  const names = new Set(tasks.map((task) => task.packageName));
  const sorted = [...names];

  return sorted.sort();
};

/**
 * The task ELK input, as `groupedElkGraphOf`: one padded compound per package with a shown task, the shown tasks inside
 * sized by `sizes` or else their names, every link at the root so ELK routes links across packages (`INCLUDE_CHILDREN`).
 */
export const elkTaskGraphOf = (
  tasks: GraphTask[],
  shown: ReadonlySet<string>,
  sizeOf: NodeSizer,
  sizes: ReadonlyMap<string, NodeSize>
): ElkNode => {
  const drawn = tasks.filter((task) => shown.has(task.id));
  const leafOf = (task: GraphTask): ElkNode => {
    const { width, height } = sizes.get(task.id) ?? sizeOf(task.name);
    const leaf: ElkNode = { id: task.id, width, height };

    return leaf;
  };
  const compoundOf = (packageName: string): ElkNode => {
    const own = drawn.filter((task) => task.packageName === packageName);
    const children = own.map(leafOf);
    const compound: ElkNode = { id: taskBoxIdOf(packageName), layoutOptions: COMPOUND_OPTIONS, children };

    return compound;
  };
  const children = sortedPackagesOf(drawn).map(compoundOf);
  const edges = taskEdgesOf(drawn, shown).map(elkEdgeOf);
  const graph: ElkNode = { id: 'root', layoutOptions: ELK_GROUPED_ROOT_OPTIONS, children, edges };

  return graph;
};

/**
 * What a task layout depends on: the sorted shown task ids, the sorted ids of the links between them, and, when a shown
 * task has a file count, those counts by sorted id. Without counts the key is the one of a graph with none.
 */
export const taskLayoutKeyOf = (tasks: GraphTask[], shown: ReadonlySet<string>, fileCounts: ReadonlyMap<string, number>): string => {
  const ids = tasks.filter((task) => shown.has(task.id)).map((task) => task.id);
  const edgeIds = taskEdgesOf(tasks, shown).map(edgeIdOf);
  const counted = ids.filter((id) => fileCounts.has(id)).sort();
  const counts = counted.map((id) => [id, fileCounts.get(id)]);
  const parts = [ids.sort(), edgeIds.sort()];
  const withCounts = [...parts, counts];
  const keyed = counts.length === 0 ? parts : withCounts;

  return JSON.stringify(keyed);
};
