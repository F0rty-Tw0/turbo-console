import type { DryRunState, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { DetailsState, PackageDetails, TaskCard } from '@turbo-console/webview-ui';

import { dependentsOf } from './dependents.util.ts';
import { toRunView } from './run-view.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { binaryMessageOf } from '../../tree/utils/root-rows.util.ts';
import { byName, isVisibleTask } from '../../tree/utils/task-filter.util.ts';
import type { DetailsInput } from '../common/details.type.ts';

const dryRunStatesById = (states: DryRunState[]): Map<string, DryRunState> => {
  const entries = states.map((state): [string, DryRunState] => [state.id, state]);

  return new Map(entries);
};

/** Fixed texts only, never the failure's message: a binary-stage failure gets its tree text, a load failure the cached-data text. */
const reloadErrorOf = (state: RootState): string | null => {
  const { error } = state;

  if (error === null) return null;

  if (error.stage === 'binary') return MESSAGE_TEXTS[binaryMessageOf(error.error.kind)];

  return MESSAGE_TEXTS['load-with-model'];
};

const toTaskCard = (
  task: TaskNode,
  input: DetailsInput,
  dependents: ReadonlyMap<string, string[]>,
  dryRunStates: ReadonlyMap<string, DryRunState>
): TaskCard => {
  const dryRunState = dryRunStates.get(task.id);
  const run = toRunView(task, input.runs(input.root, task.id), input.now);
  const card: TaskCard = {
    taskId: task.id,
    name: task.name,
    command: task.command,
    description: task.description,
    dependents: dependents.get(task.id) ?? [],
    definition: dryRunState?.definition ?? null,
    cacheStatus: dryRunState?.cache ?? null,
    isTurboTask: task.isTurboTask,
    persistent: task.persistent,
    run
  };

  return card;
};

const toPackageDetails = (pkg: PackageNode, model: WorkspaceModel, input: DetailsInput): PackageDetails => {
  const dependents = dependentsOf(model);
  const dryRunStates = dryRunStatesById(input.dryRun.states);
  const shown = pkg.tasks.filter(isVisibleTask).toSorted(byName);
  const tasks = shown.map((task) => toTaskCard(task, input, dependents, dryRunStates));
  const details: PackageDetails = {
    kind: 'package',
    root: input.root,
    packageName: input.packageName,
    path: pkg.path,
    tags: pkg.tags,
    tasks,
    dryRun: input.dryRun.phase,
    reloadError: reloadErrorOf(input.state)
  };

  return details;
};

/** The input of `toDetailsState`, read at the wall-clock time `now`. */
export const detailsInputOf = (base: Omit<DetailsInput, 'now'>, now: number): DetailsInput => {
  const input: DetailsInput = { ...base, now };

  return input;
};

/**
 * The state the page shows. A card takes the dry-run state whose id equals its task id exactly (turbo allows
 * `#` in a package name, so a prefix match would pick up another package's states). A package the model lacks, or a
 * root with no model, is `missing`.
 */
export const toDetailsState = (input: DetailsInput): DetailsState => {
  const { model } = input.state;
  const pkg = model?.packages.find((candidate) => candidate.name === input.packageName);

  if (model === null || pkg === undefined) {
    const missing: DetailsState = { kind: 'missing', root: input.root, packageName: input.packageName };

    return missing;
  }

  return toPackageDetails(pkg, model, input);
};
