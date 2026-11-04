import type { RunLogEvent } from '@turbo-console/core';

import type { ProgressRecord, ProgressRun, ProgressState } from '../common/run-progress.type.ts';

const lineStateOf = (event: RunLogEvent, record: ProgressRecord | undefined): ProgressState => {
  const isSeen = event.kind === 'seen';

  if (record === undefined) return isSeen ? 'running' : 'passed';

  if (isSeen) return record.state;

  const isLifted = record.state === 'running' || record.state === 'passed';

  return isLifted ? 'passed' : record.state;
};

const lineRecordOf = (run: ProgressRun, event: RunLogEvent, at: number): ProgressRecord | null => {
  if (event.taskId === run.owner.taskId) return null;

  const record = run.records.get(event.taskId);
  const state = lineStateOf(event, record);

  if (state === record?.state) return null;

  const changed: ProgressRecord = { owner: run.owner, taskId: event.taskId, state, at };

  return changed;
};

const hasRunningOf = (run: ProgressRun, dependencies: string[]): boolean => {
  for (const dependency of dependencies) {
    const record = run.records.get(dependency);

    if (record?.state === 'running') return true;
  }

  return false;
};

const changedRecordsOf = (
  run: ProgressRun,
  lineRecord: ProgressRecord | null,
  dependencies: string[],
  at: number
): Map<string, ProgressRecord> => {
  const records = new Map(run.records);

  if (lineRecord !== null) records.set(lineRecord.taskId, lineRecord);

  for (const dependency of dependencies) {
    const record = run.records.get(dependency);

    if (record?.state !== 'running') continue;

    const passed: ProgressRecord = { ...record, state: 'passed', at };

    records.set(dependency, passed);
  }

  return records;
};

/**
 * The run after one log line at wall-clock `at` (spec §5.1, D3): the line's own task moves by its event cell (never the
 * owner's own id, spec D8), and every running dependency of the line's task is inferred passed, owner lines included.
 * The §5.1 `failed(n)` row is void here, since `RunLogEvent` is `seen | cacheHit` and `failed` comes only from a
 * summary outcome at settle. Returns `run` itself, with no allocation, when no record changes.
 */
export const eventRunOf = (run: ProgressRun, event: RunLogEvent, at: number): ProgressRun => {
  const lineRecord = lineRecordOf(run, event, at);
  const dependencies = run.dependenciesOf(event.taskId);
  const isLifting = hasRunningOf(run, dependencies);

  if (lineRecord === null && !isLifting) return run;

  const records = changedRecordsOf(run, lineRecord, dependencies, at);
  const next: ProgressRun = { ...run, records };

  return next;
};
