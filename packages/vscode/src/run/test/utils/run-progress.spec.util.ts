import type {
  DependenciesOf,
  ProgressChanges,
  ProgressOwner,
  ProgressRecord,
  ProgressRun,
  ProgressState
} from '../../common/run-progress.type.ts';
import { DEPENDENCIES_STUB, PROGRESS_OWNER_STUB } from '../stubs/run-progress.stub.ts';

export const recordOf = (
  taskId: string,
  state: ProgressState,
  at: number,
  owner: ProgressOwner = PROGRESS_OWNER_STUB
): ProgressRecord => {
  const record: ProgressRecord = { owner, taskId, state, at };

  return record;
};

export const dependenciesOfMap = (map: ReadonlyMap<string, string[]>): DependenciesOf => {
  const dependenciesOf = (taskId: string): string[] => map.get(taskId) ?? [];

  return dependenciesOf;
};

/** Every root `progress` announces from now on, in order; the list fills as the progress changes. */
export const progressChangesOf = (progress: ProgressChanges): string[] => {
  const changes: string[] = [];

  progress.onDidChange((root): number => changes.push(root));

  return changes;
};

/** An unsettled (or `settled`) run of `PROGRESS_OWNER_STUB` over `DEPENDENCIES_STUB` holding `records`. */
export const progressRunWith = (records: ProgressRecord[], settled = false): ProgressRun => {
  const entries = records.map((record): [string, ProgressRecord] => [record.taskId, record]);
  const recordsById = new Map(entries);
  const dependenciesOf = dependenciesOfMap(DEPENDENCIES_STUB);
  const run: ProgressRun = { owner: PROGRESS_OWNER_STUB, dependenciesOf, records: recordsById, settled };

  return run;
};

/** An unsettled run holding ui#build in `state` stamped 1500, or no record when `state` is `null`. */
export const uiRunOf = (state: ProgressState | null): ProgressRun => {
  if (state === null) return progressRunWith([]);

  const record = recordOf('ui#build', state, 1500);

  return progressRunWith([record]);
};
