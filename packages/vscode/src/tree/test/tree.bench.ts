import { loadWorkspace, resolveTurbo } from '@turbo-console/core';
import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';
import type { PresetName } from '@turbo-console/repo-gen';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import { withScripts } from './utils/scripts-model.spec.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import type { LiveIds, RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { devTurboPath } from '../../shared/test/utils/dev-turbo.spec.util.ts';
import type { ToolLookup } from '../../tool/common/tool.type.ts';
import { resolveTool } from '../../tool/utils/tool-of.util.ts';
import type { ModelView, ModelViewsOf } from '../common/model-view.type.ts';
import type { RowContext, TreeNode } from '../common/tree-node.type.ts';
import type { TreeMode, TreeRow } from '../common/tree-row.type.ts';
import { ModelViews } from '../domain-logic/model-views.ts';
import { allRows } from '../utils/all-rows.util.ts';
import { diffModels } from '../utils/model-diff.util.ts';
import { nodeFor } from '../utils/node-cache.util.ts';
import { currentRowOf } from '../utils/node-rows.util.ts';
import { rowScopeOf } from '../utils/row-scope.util.ts';
import { staticAtomLookup } from '../utils/static-atoms.util.ts';
import { isListedTurboTask, taskRowOf } from '../utils/task-rows.util.ts';

const NEVER_RAN: RunLookup = () => undefined;

const NOTHING_LIVE: LiveIds = () => new Set();

const TICKED_TASKS = 20;

const TICK_NOW = 1_000_000_000;

const WARM_TICKS = 200;

/** The model `loadWorkspace` builds for a fresh `preset` fixture, kept after the fixture is disposed. */
const captureModel = async (preset: PresetName): Promise<WorkspaceModel> => {
  const fixture = await fixtureFor(PRESETS[preset]);

  try {
    const binary = await resolveTurbo(fixture.dir, { trusted: true, overridePath: devTurboPath() });

    return await loadWorkspace(binary);
  } finally {
    await fixture.dispose();
  }
};

const stateOf = (model: WorkspaceModel): RootState => {
  const folder: RootFolder = { root: model.root, name: 'bench' };
  const state: RootState = { folder, binary: null, model, error: null };

  return state;
};

/** A fresh `ModelViews` per call, so the shown filter, folder tree and labels are measured, not a warm cache hit. */
const rowsBench = (name: string, model: WorkspaceModel, mode: TreeMode, scriptsShown = false): BenchDescriptor => {
  const state = stateOf(model);
  const build = (): unknown => {
    const views = new ModelViews(resolveTool);
    const viewOf: ModelViewsOf = (loaded, shown, live) => views.of(loaded, shown, live);
    const tools: ToolLookup = (pkg, singlePackage, command) => views.toolOf(pkg, singlePackage, command);
    const context: RowContext = {
      mode,
      runs: NEVER_RAN,
      views: viewOf,
      scopeShown: false,
      scriptsShown,
      live: NOTHING_LIVE,
      now: 0,
      tools,
      atoms: staticAtomLookup(() => model)
    };

    return allRows(state, context);
  };

  return bench(name, build, { gate: true });
};

/** A copy of `model` with the first task description of the first package changed: one changed package, nothing else. */
const withOneEdit = (model: WorkspaceModel): WorkspaceModel => {
  const [first, ...rest] = model.packages;

  if (first === undefined) throw new Error('bench model has no packages');

  const [task, ...tasks] = first.tasks;

  if (task === undefined) throw new Error('bench model first package has no tasks');

  const editedTask: TaskNode = { ...task, description: 'edited' };
  const edited: PackageNode = { ...first, tasks: [editedTask, ...tasks] };
  const copy: WorkspaceModel = { ...model, packages: [edited, ...rest] };

  return copy;
};

const diffBench = (name: string, model: WorkspaceModel): BenchDescriptor => {
  const after = withOneEdit(model);
  const diff = (): unknown => diffModels(model, after);

  return bench(name, diff, { gate: true });
};

/** A run of `task` that started 65 s before `TICK_NOW`, still going. */
const runningEntryOf = (root: string, pkg: PackageNode, task: TaskNode): RunEntry => {
  const launchedAt = TICK_NOW - 65_000;
  const processStartedAt = TICK_NOW - 64_000;
  const entry: RunEntry = { ...RUN_ENTRY_STUB, root, taskId: task.id, packageName: pkg.name, task, launchedAt, processStartedAt };

  return entry;
};

/**
 * The first `TICKED_TASKS` visible turbo tasks of the shown packages in model order (packages, then `tasks` order),
 * running. Scripts and an Atomizer group's aggregate are not ticked: the tree lists no row for them (the umbrella stands in).
 */
const firstRunning = (model: WorkspaceModel, view: ModelView): RunEntry[] => {
  const atoms = staticAtomLookup(() => model);
  const entries: RunEntry[] = [];

  for (const pkg of view.packages.values()) {
    const { groups } = atoms(model.root, pkg.name);
    const runnable = pkg.tasks.filter((task) => isListedTurboTask(task, groups));

    for (const task of runnable) entries.push(runningEntryOf(model.root, pkg, task));

    if (entries.length >= TICKED_TASKS) break;
  }

  return entries.slice(0, TICKED_TASKS);
};

/** The tree row of `entry`'s task: the row the tree caches a node for. */
const entryRowOf = (model: WorkspaceModel, entry: RunEntry, context: RowContext): TreeRow => {
  const pkg = context.views(model, context.scriptsShown, context.live(model.root)).packages.get(entry.packageName);

  if (pkg === undefined) throw new Error(`bench package ${entry.packageName} is not shown`);

  const row = taskRowOf(rowScopeOf(model.root, model), pkg, entry.taskId, context);

  if (row === undefined) throw new Error(`bench task ${entry.taskId} has no row`);

  return row;
};

/** A running task's row (plain or continuous), not the loading stand-in of a node the tree no longer has. */
const isRunningRow = (row: TreeRow): boolean => row.contextValue === 'turboTask.running';

/**
 * Spec §4.6 tick cost, warm: the model's view is built and the running tasks' nodes are cached, as after the first draw.
 * The timed function rebuilds only the rows one tick redraws, the first `TICKED_TASKS` running ones. It times only the
 * extension host's row rebuild, not VS Code's redraw. The setup runs `WARM_TICKS` ticks first, so the samples sit past
 * the JIT tier-up instead of on its knee.
 */
const tickBench = (name: string, model: WorkspaceModel): BenchDescriptor => {
  const state = stateOf(model);
  const views = new ModelViews(resolveTool);
  const entries = firstRunning(model, views.of(model, false, new Set()));

  if (entries.length < TICKED_TASKS) throw new Error(`bench model has ${entries.length} runnable tasks`);

  const byId = new Map(entries.map((entry): [string, RunEntry] => [entry.taskId, entry]));
  const runs: RunLookup = (_root, taskId) => byId.get(taskId);
  const viewOf: ModelViewsOf = (loaded, scriptsShown, live) => views.of(loaded, scriptsShown, live);
  const tools: ToolLookup = (pkg, singlePackage, command) => views.toolOf(pkg, singlePackage, command);
  const running: ReadonlySet<string> = new Set(byId.keys());
  const runningIds: LiveIds = () => running;
  const context: RowContext = {
    mode: 'folders',
    runs,
    views: viewOf,
    scopeShown: false,
    scriptsShown: false,
    live: runningIds,
    now: TICK_NOW,
    tools,
    atoms: staticAtomLookup(() => model)
  };
  const cache = new Map<string, TreeNode>();
  const nodes = entries.map((entry) => nodeFor(cache, entryRowOf(model, entry, context)));
  const tick = (): TreeRow[] => nodes.map((node) => currentRowOf(state, node, context));
  const firstRows = tick();
  const isAllRunning = firstRows.every(isRunningRow);

  if (!isAllRunning) throw new Error('bench tick rebuilds a row that is not a running task');

  for (let round = 1; round < WARM_TICKS; round += 1) tick();

  return bench(name, tick, { gate: true });
};

const targetLike = await captureModel('target-like');
const stretch300 = await captureModel('stretch-300');

const benches: BenchDescriptor[] = [
  rowsBench('tree-rows-folders-target-like', targetLike, 'folders'),
  rowsBench('tree-rows-list-target-like', targetLike, 'list'),
  rowsBench('tree-rows-folders-stretch-300', stretch300, 'folders'),
  rowsBench('tree-rows-list-stretch-300', stretch300, 'list'),
  rowsBench('tree-rows-scripts-stretch-300', withScripts(stretch300), 'folders', true),
  diffBench('model-diff-stretch-300', stretch300),
  tickBench('tree-tick-stretch-300', stretch300)
];

export default benches;
