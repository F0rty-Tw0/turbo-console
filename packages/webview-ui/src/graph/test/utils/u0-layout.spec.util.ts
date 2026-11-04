import type { ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';

import { edgesUnder, placementOf } from './layout-geometry.spec.util.ts';
import { qualityOf } from './layout-quality.spec.util.ts';
import type { LayoutGrouping } from '../../../bridge/common/graph-message.type.ts';
import type { GraphReady, GraphTask } from '../../../bridge/common/graph-state.type.ts';
import { NO_NAMES } from '../../common/graph-task.const.ts';
import type { TaskNaming } from '../../common/graph-task.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';
import { drawnGraphOf } from '../../utils/drawn-graph.util.ts';
import { layoutGraphOf } from '../../utils/elk-graph.util.ts';
import { elkTaskGraphOf } from '../../utils/elk-task-graph.util.ts';
import { folderOf } from '../../utils/folder-group.util.ts';
import type { LayoutQuality } from '../common/layout-quality.type.ts';
import type { U0PackageRecord, U0TaskInput, U0TaskRecord, U0TaskView, U0View } from '../common/u0-workspace.type.ts';
import { TASK_STATE_STUB } from '../stubs/graph-task.stub.ts';
import { U0_CANVAS_STUB, U0_EDGES_STUB, U0_PACKAGES_STUB, U0_WORKSPACE_STUB } from '../stubs/u0-workspace.stub.ts';

const { packages, tasks, titleWidths, views, capturedEdgeIds } = U0_WORKSPACE_STUB;

const sizeEntryOf = (key: string, record: U0PackageRecord | U0TaskRecord): [string, NodeSize] => {
  const { width, height } = record;
  const size: NodeSize = { width, height };

  return [key, size];
};

const taskOf = (record: U0TaskRecord): GraphTask => {
  const { id, packageName, name, isTurboTask, dependencies } = record;
  const task: GraphTask = { id, packageName, name, command: null, isRunnable: true, isTurboTask, dependencies };

  return task;
};

const PACKAGE_SIZES = new Map(packages.map((record) => sizeEntryOf(record.name, record)));

const TASK_SIZES: ReadonlyMap<string, NodeSize> = new Map(tasks.map((record) => sizeEntryOf(record.id, record)));

const TASKS = tasks.map(taskOf);

const FOLDERS: ReadonlyMap<string, string> = new Map(packages.map((record) => [record.name, folderOf(record.path)]));

const TITLE_WIDTHS: ReadonlyMap<string, number> = new Map(Object.entries(titleWidths));

/** Task sizes all come from the capture (`sizes`), so the task builder must never measure a name. */
const throwingSizer = (name: string): NodeSize => {
  throw new Error(`u0 stub: no captured size for ${name}`);
};

/** The captured size of a U0 package; throws for any other name, so the builder never measures one. */
const capturedSizeOf = (name: string): NodeSize => {
  const size = PACKAGE_SIZES.get(name);

  if (size === undefined) throw new Error(`u0 stub: no captured size for ${name}`);

  return size;
};

const packageInputOf = (mode: LayoutGrouping): ElkNode => {
  const state: GraphReady = { ...TASK_STATE_STUB, packages: U0_PACKAGES_STUB, edges: U0_EDGES_STUB, tasks: [] };
  const drawn = drawnGraphOf(state);

  return layoutGraphOf(drawn, mode, capturedSizeOf);
};

/**
 * The task builder's input for a captured task view: every U0 task (scripts included), the view's shown ids, each task's
 * captured size and each box's captured title width; `grouped` picks the naming, so the builder picks the layering.
 */
const taskInputOf = (view: U0TaskView, grouped: boolean): ElkNode => {
  const shown = new Set(views[view]);
  const naming: TaskNaming = { grouped, scopeShown: true, labels: NO_NAMES, folders: FOLDERS };
  const input: U0TaskInput = { tasks: TASKS, shown, sizes: TASK_SIZES, titleWidths: TITLE_WIDTHS, naming };

  return elkTaskGraphOf(input, throwingSizer);
};

/** The ELK input the production builders make for a captured U0 view. */
export const u0InputOf = (view: U0View): ElkNode => {
  switch (view) {
    case 'pkgFlat':
      return packageInputOf('flat');
    case 'pkgGrouped':
      return packageInputOf('folders');
    case 'allTasksFlat':
      return taskInputOf('allTasks', false);
    case 'allTasksGrouped':
      return taskInputOf('allTasks', true);
    case 'formatOnlyFlat':
      return taskInputOf('formatOnly', false);
    case 'formatOnlyGrouped':
      return taskInputOf('formatOnly', true);
    case 'lintTypecheckUnitFlat':
      return taskInputOf('lintTypecheckUnit', false);
    case 'lintTypecheckUnitGrouped':
      return taskInputOf('lintTypecheckUnit', true);
  }
};

/** The shown task ids of a captured task view, sorted. */
export const u0ShownIdsOf = (view: U0TaskView): string[] => {
  const ids = [...views[view]];

  return ids.sort();
};

/** The edge ids of a captured view's ELK request at any depth, sorted. */
export const u0CapturedEdgeIdsOf = (view: U0View): string[] => capturedEdgeIds[view];

/** The leaf ids of an ELK graph at any depth, sorted. */
export const sortedLeafIdsOf = (graph: ElkNode): string[] => {
  const ids = placementOf(graph).leaves.map((leaf) => leaf.id);

  return ids.sort();
};

/** The edge ids of an ELK graph at any depth, sorted. */
export const sortedEdgeIdsOf = (graph: ElkNode): string[] => {
  const ids = edgesUnder(graph).map((edge) => edge.id);

  return ids.sort();
};

/** The quality of a captured U0 view as real elkjs lays out a fresh builder input, on the captured canvas. */
const u0QualityOf = async (view: U0View): Promise<LayoutQuality> => {
  const elk = new elkConstructor();
  const laidOut = await elk.layout(u0InputOf(view));

  return qualityOf(u0InputOf(view), laidOut, U0_CANVAS_STUB);
};

/** The quality of every captured U0 view, laid out one after the other. */
export const u0QualitiesOf = async (): Promise<Record<U0View, LayoutQuality>> => {
  const byView: Record<U0View, LayoutQuality> = {
    pkgFlat: await u0QualityOf('pkgFlat'),
    pkgGrouped: await u0QualityOf('pkgGrouped'),
    allTasksFlat: await u0QualityOf('allTasksFlat'),
    allTasksGrouped: await u0QualityOf('allTasksGrouped'),
    formatOnlyFlat: await u0QualityOf('formatOnlyFlat'),
    formatOnlyGrouped: await u0QualityOf('formatOnlyGrouped'),
    lintTypecheckUnitFlat: await u0QualityOf('lintTypecheckUnitFlat'),
    lintTypecheckUnitGrouped: await u0QualityOf('lintTypecheckUnitGrouped')
  };

  return byView;
};
