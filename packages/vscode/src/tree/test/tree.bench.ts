import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import { benchStateOf, captureModel } from './utils/bench-model.spec.util.ts';
import { withScripts } from './utils/scripts-model.spec.util.ts';
import type { ToolLookup } from '../../tool/common/tool.type.ts';
import { resolveTool } from '../../tool/utils/tool-of.util.ts';
import type { ModelViewsOf } from '../common/model-view.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeMode } from '../common/tree-row.type.ts';
import { ModelViews } from '../domain-logic/model-views.ts';
import { allRows } from '../utils/all-rows.util.ts';
import { diffModels } from '../utils/model-diff.util.ts';
import { staticAtomLookup } from '../utils/static-atoms.util.ts';

/** A fresh `ModelViews` per call, so the shown filter, folder tree and labels are measured, not a warm cache hit. */
const rowsBench = (name: string, model: WorkspaceModel, mode: TreeMode, scriptsShown = false): BenchDescriptor => {
  const state = benchStateOf(model);
  const build = (): unknown => {
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
      prediction: () => null
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

const targetLike = await captureModel('target-like');
const stretch300 = await captureModel('stretch-300');

const benches: BenchDescriptor[] = [
  rowsBench('tree-rows-folders-target-like', targetLike, 'folders'),
  rowsBench('tree-rows-list-target-like', targetLike, 'list'),
  rowsBench('tree-rows-folders-stretch-300', stretch300, 'folders'),
  rowsBench('tree-rows-list-stretch-300', stretch300, 'list'),
  rowsBench('tree-rows-scripts-stretch-300', withScripts(stretch300), 'folders', true),
  diffBench('model-diff-stretch-300', stretch300)
];

export default benches;
