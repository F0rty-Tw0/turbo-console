import type { DependenciesOf, ProgressOwner, ProgressRecord, ProgressRun, ProgressState } from '../../common/run-progress.type.ts';
import { DEPENDENCIES_STUB, OWNER_STUB } from '../stubs/run-progress.stub.ts';

export const recordOf = (taskId: string, state: ProgressState, at: number, owner: ProgressOwner = OWNER_STUB): ProgressRecord => {
  const record: ProgressRecord = { owner, taskId, state, at };

  return record;
};

/** The dependency lookup of a run whose snapshot is `map`. */
export const dependenciesOfMap = (map: ReadonlyMap<string, string[]>): DependenciesOf => {
  const dependenciesOf = (taskId: string): string[] => map.get(taskId) ?? [];

  return dependenciesOf;
};

/** An unsettled (or `settled`) run of `OWNER_STUB` over `DEPENDENCIES_STUB` holding `records`. */
export const progressRunWith = (records: ProgressRecord[], settled = false): ProgressRun => {
  const entries = records.map((record): [string, ProgressRecord] => [record.taskId, record]);
  const recordsById = new Map(entries);
  const dependenciesOf = dependenciesOfMap(DEPENDENCIES_STUB);
  const run: ProgressRun = { owner: OWNER_STUB, dependenciesOf, records: recordsById, settled };

  return run;
};
