import { loadWorkspace, resolveTurbo } from '@turbo-console/core';
import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';
import type { PresetName } from '@turbo-console/repo-gen';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import type { RunLookup } from '../../run/common/run.type.ts';
import { devTurboPath } from '../../shared/test/utils/dev-turbo.spec.util.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeMode } from '../common/tree-row.type.ts';
import { ModelViews } from '../domain-logic/model-views.ts';
import { allRows } from '../utils/all-rows.util.ts';
import { diffModels } from '../utils/model-diff.util.ts';

const NEVER_RAN: RunLookup = () => undefined;

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
const rowsBench = (name: string, model: WorkspaceModel, mode: TreeMode): BenchDescriptor => {
  const state = stateOf(model);
  const build = (): unknown => {
    const views = new ModelViews();
    const context: RowContext = { mode, runs: NEVER_RAN, views: (loaded) => views.of(loaded), scopeShown: false };

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
  diffBench('model-diff-stretch-300', stretch300)
];

export default benches;
