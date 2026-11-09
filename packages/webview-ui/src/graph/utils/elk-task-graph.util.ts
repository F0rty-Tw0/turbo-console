import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { edgeIdOf } from './edge-id.util.ts';
import { elkEdgeOf } from './elk-grouped-graph.util.ts';
import { groupedRootOptionsOf, paddedOptionsOf, taskLayeringOf } from './elk-options.util.ts';
import { packComponentsOf } from './elk-pack.util.ts';
import {
  compoundOptionsOf,
  folderBoxIdOf,
  isTitledRow,
  scriptsBoxIdOf,
  taskBoxIdOf,
  taskFolderOf,
  taskPackagesOf,
  titledRowOf
} from './task-compound.util.ts';
import type { GraphEdge, GraphTask } from '../../bridge/common/graph-state.type.ts';
import { TASK_LAYOUT_VERSION } from '../common/graph-layout.const.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import type { TaskLayoutRequest, TaskNaming } from '../common/graph-task.type.ts';
import type { ElkOptions } from '../common/layout.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';

type TaskGraphInput = Pick<TaskLayoutRequest, 'tasks' | 'shown' | 'sizes' | 'naming'> & Pick<TaskDrawing, 'titleWidths'>;

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
  const names = taskPackagesOf(tasks);
  const sorted = [...names];

  return sorted.sort();
};

/** The Scripts compound of a package around its script `leaves`, at least as wide as its title; none without a script. */
const scriptsBoxesOf = (
  packageName: string,
  leaves: ElkNode[],
  titleWidths: ReadonlyMap<string, number>,
  base: ElkOptions
): ElkNode[] => {
  if (leaves.length === 0) return [];

  const id = scriptsBoxIdOf(packageName);
  const layoutOptions = compoundOptionsOf(titleWidths.get(id), base);
  const compound: ElkNode = { id, layoutOptions, children: leaves };
  const boxes = [compound];

  return boxes;
};

/**
 * The root children: each package compound of `packageBoxes` (keyed by package name) inside the folder compound
 * `folderBoxIdOf` names, the folder compounds in code unit order, so the root folder comes first, each at least as wide
 * as its folder title; a package with no folder box, every package while ungrouped, stays at the root.
 */
const rootChildrenOf = (
  packageBoxes: ReadonlyMap<string, ElkNode>,
  naming: TaskNaming,
  titleWidths: ReadonlyMap<string, number>,
  base: ElkOptions
): ElkNode[] => {
  const atRoot: ElkNode[] = [];
  const byFolder = new Map<string, ElkNode[]>();

  for (const [packageName, box] of packageBoxes) {
    const folderId = folderBoxIdOf(packageName, naming);

    if (folderId === null) {
      atRoot.push(box);
    } else {
      const siblings = byFolder.get(folderId) ?? [];

      byFolder.set(folderId, [...siblings, box]);
    }
  }

  const folderKeys = byFolder.keys();
  const folderIds = [...folderKeys];

  folderIds.sort();
  const folderBoxOf = (id: string): ElkNode => {
    const layoutOptions = compoundOptionsOf(titleWidths.get(id), base);
    const children = byFolder.get(id) ?? [];
    const compound: ElkNode = { id, layoutOptions, children };

    return compound;
  };
  const folderBoxes = folderIds.map(folderBoxOf);

  return [...atRoot, ...folderBoxes];
};

/** How many titled-row boxes `drawn` makes: each adds a title-slot leaf; a package has a Scripts box exactly when it has a script. */
const titleSlotCountOf = (drawn: GraphTask[], titleWidths: ReadonlyMap<string, number>): number => {
  const hasTitleSlot = (packageName: string): boolean => {
    const own = drawn.filter((task) => task.packageName === packageName);
    const turboTasks = own.filter((task) => task.isTurboTask);
    const scripts = own.filter((task) => !task.isTurboTask);

    return isTitledRow(titleWidths.get(packageName), turboTasks, scripts);
  };
  const titled = sortedPackagesOf(drawn).filter(hasTitleSlot);

  return titled.length;
};

/**
 * The task ELK input, as `groupedElkGraphOf`: one padded compound per package with a shown task, at least as wide as its
 * title in `titleWidths`, holding the shown turbo tasks and, when a script is shown, a Scripts compound around the shown
 * scripts; tasks are sized by `sizes` or else their names, every link at the root so ELK routes links across packages and
 * into the nested Scripts compounds (`INCLUDE_CHILDREN`). While `naming` is grouped each package compound sits in its
 * folder compound; ungrouped the package compounds are the root children. Root children no link joins are packed into
 * wrappers (`packComponentsOf`). A package compound with a title width, one turbo task and no Scripts compound is a
 * titled-row box (`titledRowOf`): a title placeholder above its task, tied to it.
 */
export const elkTaskGraphOf = (request: TaskGraphInput, sizeOf: NodeSizer): ElkNode => {
  const { tasks, shown, sizes, titleWidths, naming } = request;
  const drawn = tasks.filter((task) => shown.has(task.id));
  const layering = taskLayeringOf(naming);
  const leafCount = drawn.length + titleSlotCountOf(drawn, titleWidths);
  const base = paddedOptionsOf(leafCount, layering);
  const leafOf = (task: GraphTask): ElkNode => {
    const { width, height } = sizes.get(task.id) ?? sizeOf(task.name);
    const leaf: ElkNode = { id: task.id, width, height };

    return leaf;
  };
  const compoundOf = (packageName: string): ElkNode => {
    const own = drawn.filter((task) => task.packageName === packageName);
    const turboLeaves = own.filter((task) => task.isTurboTask).map(leafOf);
    const scriptLeaves = own.filter((task) => !task.isTurboTask).map(leafOf);
    const scriptsBoxes = scriptsBoxesOf(packageName, scriptLeaves, titleWidths, base);
    const [onlyLeaf] = turboLeaves;
    const titleWidth = titleWidths.get(packageName);
    const layoutOptions = compoundOptionsOf(titleWidth, base);

    const titledRow = isTitledRow(titleWidth, turboLeaves, scriptsBoxes);

    if (onlyLeaf !== undefined && titleWidth !== undefined && titledRow) {
      return titledRowOf(packageName, onlyLeaf, titleWidth, layoutOptions);
    }

    const children = [...turboLeaves, ...scriptsBoxes];
    const compound: ElkNode = { id: taskBoxIdOf(packageName), layoutOptions, children };

    return compound;
  };
  const boxEntryOf = (packageName: string): [string, ElkNode] => [packageName, compoundOf(packageName)];
  const packageBoxes = new Map(sortedPackagesOf(drawn).map(boxEntryOf));
  const children = rootChildrenOf(packageBoxes, naming, titleWidths, base);
  const edges = taskEdgesOf(drawn, shown).map(elkEdgeOf);
  const layoutOptions = groupedRootOptionsOf(leafCount, layering);
  const graph: ElkNode = { id: 'root', layoutOptions, children, edges };

  return packComponentsOf(graph);
};

/** The sorted `[packageName, folder]` pairs of the packages of `drawn` while grouped; none while ungrouped. */
const folderPairsOf = (drawn: GraphTask[], naming: TaskNaming): [string, string][] => {
  if (!naming.grouped) return [];

  const pairOf = (packageName: string): [string, string] => [packageName, taskFolderOf(packageName, naming)];

  return sortedPackagesOf(drawn).map(pairOf);
};

/**
 * What a task layout depends on: the sorted shown task ids, the sorted ids of the links between them, when a shown task
 * has a file count, those counts by sorted id, and last the grouping, the scope bit (box titles, so box widths, follow
 * it) and, while grouped, each shown package's folder, and as the very last element the task layout version. Without counts
 * the key is the one of a graph with none; a key saved before the last element existed never equals one built now.
 */
export const taskLayoutKeyOf = (
  tasks: GraphTask[],
  shown: ReadonlySet<string>,
  fileCounts: ReadonlyMap<string, number>,
  naming: TaskNaming
): string => {
  const drawn = tasks.filter((task) => shown.has(task.id));
  const ids = drawn.map((task) => task.id);
  const edgeIds = taskEdgesOf(tasks, shown).map(edgeIdOf);
  const counted = ids.filter((id) => fileCounts.has(id)).sort();
  const counts = counted.map((id) => [id, fileCounts.get(id)]);
  const parts = [ids.sort(), edgeIds.sort()];
  const withCounts = [...parts, counts];
  const keyed = counts.length === 0 ? parts : withCounts;
  const grouping = [naming.grouped, naming.scopeShown, folderPairsOf(drawn, naming)];
  const withGrouping = [...keyed, grouping, TASK_LAYOUT_VERSION];

  return JSON.stringify(withGrouping);
};
