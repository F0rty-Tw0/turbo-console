import { runStateOf } from './task-run.util.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { PackageRuns } from '../common/graph-page.type.ts';
import { PACKAGE_RUN_CLASS, RUN_CLASS_PREFIX, RUN_PRECEDENCE } from '../common/graph-task.const.ts';
import type { TaskRuns } from '../common/task-details.type.ts';

/** The class a node of this run state carries: `run-<state>`. */
export const runClassOf = (state: GraphRunState): string => `${RUN_CLASS_PREFIX}${state}`;

/** The first of `RUN_PRECEDENCE` that `states` holds; `null` for none. */
export const strongestRunOf = (states: GraphRunState[]): GraphRunState | null => {
  const isHeld = (state: GraphRunState): boolean => states.includes(state);
  const strongest = RUN_PRECEDENCE.find(isHeld);

  return strongest ?? null;
};

/** Whether `state` ranks above `current` in `RUN_PRECEDENCE`; any state beats none. */
const outranks = (state: GraphRunState, current: GraphRunState | undefined): boolean => {
  if (current === undefined) return true;

  return RUN_PRECEDENCE.indexOf(state) < RUN_PRECEDENCE.indexOf(current);
};

/** Each package's strongest state among its listed tasks that have one; atom file ids and unlisted ids add nothing. */
export const packageRunsOf = (runs: TaskRuns, tasks: GraphTask[]): PackageRuns => {
  const packageRuns = new Map<string, GraphRunState>();

  for (const task of tasks) {
    const state = runStateOf(runs, task.id);

    if (state === null) continue;

    const current = packageRuns.get(task.packageName);
    const isStronger = outranks(state, current);

    if (isStronger) packageRuns.set(task.packageName, state);
  }

  return packageRuns;
};

/** The strongest state among the named packages; a name with no state is skipped. */
export const folderRunOf = (runs: PackageRuns, names: string[]): GraphRunState | null => {
  const states: GraphRunState[] = [];

  for (const name of names) {
    const state = runs.get(name);

    if (state !== undefined) states.push(state);
  }

  return strongestRunOf(states);
};

/** The classes a package or collapsed folder node carries for this state: none for `null`, else `run-<state>` and the marker. */
export const runMarkClassesOf = (state: GraphRunState | null): string[] => {
  if (state === null) return [];

  return [runClassOf(state), PACKAGE_RUN_CLASS];
};
