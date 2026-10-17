import type { DryRunState, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { DetailsState, PackageDetails, TaskCard } from '@turbo-console/webview-ui';

import { cardTasksOf } from './card-tasks.util.ts';
import { dependentsOf } from './dependents.util.ts';
import { toRunView } from './run-view.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { hasScriptBody } from '../../run/utils/run-refusal.util.ts';
import { scriptCommandOf } from '../../run/utils/script-name.util.ts';
import { LOG_LINE_MAX } from '../../shared/common/text.const.ts';
import { cleanLines } from '../../shared/utils/clean-text.util.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { binaryMessageOf } from '../../tree/utils/root-rows.util.ts';
import type { CardSources, DetailsInput } from '../common/details.type.ts';

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

/**
 * Repo text, cleaned as lines for the page; a command with nothing visible left, whitespace aside, is `null`, so its field
 * reads "none".
 */
const cardCommandOf = (command: string | null): string | null => {
  if (command === null) return null;

  const cleaned = cleanLines(command, LOG_LINE_MAX);
  const trimmed = cleaned.trim();

  return trimmed === '' ? null : cleaned;
};

/**
 * `runCommand` is what a user would type for a script; a turbo task has none, and neither has a script with an unsafe
 * name or no body, which Run and Copy refuse. The package-dir check stays with Run, as in the pickers.
 */
const toTaskCard = (task: TaskNode, sources: CardSources): TaskCard => {
  const { input, dependents, dryRunStates, model } = sources;
  const dryRunState = dryRunStates.get(task.id);
  const run = toRunView(task, input.runs(input.root, task.id), input.now);
  const scriptCommand = scriptCommandOf(model.packageManager.name, task.name);
  const runCommand = task.isTurboTask || !hasScriptBody(task) ? null : scriptCommand;
  const card: TaskCard = {
    taskId: task.id,
    name: task.name,
    command: cardCommandOf(task.command),
    description: task.description,
    dependents: dependents.get(task.id) ?? [],
    definition: dryRunState?.definition ?? null,
    cacheStatus: dryRunState?.cache ?? null,
    isTurboTask: task.isTurboTask,
    persistent: task.persistent,
    runCommand,
    run
  };

  return card;
};

const toPackageDetails = (pkg: PackageNode, model: WorkspaceModel, input: DetailsInput): PackageDetails => {
  const sources: CardSources = {
    input,
    dependents: dependentsOf(model),
    dryRunStates: dryRunStatesById(input.dryRun.states),
    model
  };
  const { shown, hiddenScriptCount } = cardTasksOf(pkg, input);
  const tasks = shown.map((task) => toTaskCard(task, sources));
  const details: PackageDetails = {
    kind: 'package',
    root: input.root,
    packageName: input.packageName,
    path: pkg.path,
    tags: pkg.tags,
    tasks,
    dryRun: input.dryRun.phase,
    reloadError: reloadErrorOf(input.state),
    scriptsShown: input.scriptsShown,
    hiddenScriptCount
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
