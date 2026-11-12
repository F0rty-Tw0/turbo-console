import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import { SHARED_AFFECTED_STUB } from './stubs/shared-affected.stub.ts';
import { readsOf } from './utils/affected-reads.spec.util.ts';
import { benchStateOf, captureModel } from './utils/bench-model.spec.util.ts';
import { withScripts } from './utils/scripts-model.spec.util.ts';
import type { ToolLookup } from '../../tool/common/tool.type.ts';
import { resolveTool } from '../../tool/utils/tool-of.util.ts';
import type { AffectedEntry, AffectedMark, AffectedView } from '../common/affected.type.ts';
import type { ModelViewsOf } from '../common/model-view.type.ts';
import type { PredictionCache, PredictionLookup, PredictionView } from '../common/prediction.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeMode, TreeRow } from '../common/tree-row.type.ts';
import { ModelViews } from '../domain-logic/model-views.ts';
import { allRows } from '../utils/all-rows.util.ts';
import { diffModels } from '../utils/model-diff.util.ts';
import { staticAtomLookup } from '../utils/static-atoms.util.ts';

const SETTLED_AT = 1_000_000_000;

const NO_PREDICTION: PredictionLookup = () => null;

type RowsShown = Pick<RowContext, 'scriptsShown' | 'prediction' | 'affected'>;

const PLAIN: RowsShown = { scriptsShown: false, prediction: NO_PREDICTION, affected: SHARED_AFFECTED_STUB };

const WITH_SCRIPTS: RowsShown = { scriptsShown: true, prediction: NO_PREDICTION, affected: SHARED_AFFECTED_STUB };

/** A settled prediction that says `HIT` for every task of every package of `model`, built once outside the timed call. */
const allHitOf = (model: WorkspaceModel): PredictionLookup => {
  const viewOf = (pkg: PackageNode): [string, PredictionView] => {
    const pairs = pkg.tasks.map((task): [string, PredictionCache] => [task.id, 'HIT']);
    const view: PredictionView = { settledAt: SETTLED_AT, tasks: new Map(pairs) };

    return [pkg.name, view];
  };
  const byPackage = new Map(model.packages.map(viewOf));
  const lookup: PredictionLookup = (_root, packageName) => byPackage.get(packageName) ?? null;

  return lookup;
};

/** A loaded affected view that marks every task of every package of `model`, `changed` and `dependency` alternating, built once outside the timed call. */
const allMarkedOf = (model: WorkspaceModel): RowsShown['affected'] => {
  const entryOf = (task: TaskNode, index: number): [string, AffectedEntry] => {
    const mark: AffectedMark = index % 2 === 0 ? 'changed' : 'dependency';
    const entry: AffectedEntry = { mark, line: `Affected (task level): ${mark} (as of 14:05)` };

    return [task.id, entry];
  };
  const tasks = model.packages.flatMap((pkg) => pkg.tasks);
  const view: AffectedView = { settledAt: SETTLED_AT, mode: 'task', tasks: new Map(tasks.map(entryOf)) };

  return readsOf(view);
};

const isPredictedRow = (row: TreeRow): boolean => row.tooltip.some((line) => line.startsWith('Prediction:'));

const isMarkedRow = (row: TreeRow): boolean => row.tooltip.some((line) => line.startsWith('Affected'));

/** A fresh `ModelViews` per call, so the shown filter, folder tree and labels are measured, not a warm cache hit. */
const rowsBench = (name: string, model: WorkspaceModel, mode: TreeMode, inputs = PLAIN): BenchDescriptor => {
  const { scriptsShown, prediction, affected } = inputs;
  const state = benchStateOf(model);
  const build = (): TreeRow[] => {
    const views = new ModelViews(resolveTool);
    const viewOf: ModelViewsOf = (loaded, shown, live) => views.of(loaded, shown, live);
    const tools: ToolLookup = (pkg, singlePackage, command) => views.toolOf(pkg, singlePackage, command);
    const context: RowContext = {
      mode,
      runs: () => undefined,
      views: viewOf,
      scopeShown: false,
      scriptsShown,
      live: () => new Set(),
      now: 0,
      countsMemo: new WeakMap(),
      tools,
      atoms: staticAtomLookup(() => model),
      prediction,
      affected
    };

    return allRows(state, context);
  };
  const isPredicting = prediction !== NO_PREDICTION;
  const hasPredictedRow = build().some(isPredictedRow);

  const isMarking = affected !== SHARED_AFFECTED_STUB;
  const hasMarkedRow = build().some(isMarkedRow);

  if (isPredicting && !hasPredictedRow) throw new Error(`bench ${name} shows no predicted row`);

  if (isMarking && !hasMarkedRow) throw new Error(`bench ${name} shows no affected row`);

  return bench(name, build, { gate: true });
};

/**
 * A copy of `model` with the first task description of the first package that has tasks changed: one changed package,
 * nothing else. The root `//` that repo-gen lists first has no tasks, so the edit lands on the same package as before
 * the root joined the model.
 */
const withOneEdit = (model: WorkspaceModel): WorkspaceModel => {
  const hasTasks = (pkg: PackageNode): boolean => pkg.tasks.length > 0;
  const at = model.packages.findIndex(hasTasks);
  const first = model.packages[at];

  if (first === undefined) throw new Error('bench model has no package with tasks');

  const [task, ...tasks] = first.tasks;

  if (task === undefined) throw new Error('bench model first package has no tasks');

  const editedTask: TaskNode = { ...task, description: 'edited' };
  const edited: PackageNode = { ...first, tasks: [editedTask, ...tasks] };
  const packages = model.packages.with(at, edited);
  const copy: WorkspaceModel = { ...model, packages };

  return copy;
};

const diffBench = (name: string, model: WorkspaceModel): BenchDescriptor => {
  const after = withOneEdit(model);
  const diff = (): unknown => diffModels(model, after);

  return bench(name, diff, { gate: true });
};

const targetLike = await captureModel('target-like');
const stretch300 = await captureModel('stretch-300');
const allHit: RowsShown = { scriptsShown: false, prediction: allHitOf(stretch300), affected: SHARED_AFFECTED_STUB };
const allMarked: RowsShown = { scriptsShown: false, prediction: NO_PREDICTION, affected: allMarkedOf(stretch300) };

const benches: BenchDescriptor[] = [
  rowsBench('tree-rows-folders-target-like', targetLike, 'folders'),
  rowsBench('tree-rows-list-target-like', targetLike, 'list'),
  rowsBench('tree-rows-folders-stretch-300', stretch300, 'folders'),
  rowsBench('tree-rows-list-stretch-300', stretch300, 'list'),
  rowsBench('tree-rows-scripts-stretch-300', withScripts(stretch300), 'folders', WITH_SCRIPTS),
  rowsBench('tree-rows-predicted-stretch-300', stretch300, 'folders', allHit),
  rowsBench('tree-rows-affected-stretch-300', stretch300, 'folders', allMarked),
  diffBench('model-diff-stretch-300', stretch300)
];

export default benches;
