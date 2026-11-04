import type { RunLogEvent } from '@turbo-console/core';

import type { ProgressRecord, ProgressRun, ProgressState } from '../common/run-progress.type.ts';

const lineStateOf = (event: RunLogEvent, record: ProgressRecord | undefined): ProgressState => {
  const isSeen = event.kind === 'seen';

  if (record === undefined) return isSeen ? 'running' : 'passed';

  if (isSeen) return record.state;

  const isLifted = record.state === 'running' || record.state === 'passed';

  return isLifted ? 'passed' : record.state;
};

const lineRecordsOf = (run: ProgressRun, event: RunLogEvent, at: number): ProgressRecord[] => {
  if (event.taskId === run.owner.taskId) return [];

  const record = run.records.get(event.taskId);
  const state = lineStateOf(event, record);

  if (state === record?.state) return [];

  const changed: ProgressRecord = { owner: run.owner, taskId: event.taskId, state, at };

  return [changed];
};

const inferredRecordsOf = (run: ProgressRun, taskId: string, at: number): ProgressRecord[] => {
  const dependencies = run.dependenciesOf(taskId);
  const lifted: ProgressRecord[] = [];

  for (const dependency of dependencies) {
    const record = run.records.get(dependency);

    if (record?.state !== 'running') continue;

    const passed: ProgressRecord = { ...record, state: 'passed', at };

    lifted.push(passed);
  }

  return lifted;
};

/**
 * The run after one log line at wall-clock `at` (spec §5.1, D3): the line's own task moves by its event cell (never the
 * owner's own id, spec D8), and every running dependency of the line's task is inferred passed, owner lines included.
 * Returns `run` itself when no record changes.
 */
export const eventRunOf = (run: ProgressRun, event: RunLogEvent, at: number): ProgressRun => {
  const lineRecords = lineRecordsOf(run, event, at);
  const inferredRecords = inferredRecordsOf(run, event.taskId, at);
  const changed = [...lineRecords, ...inferredRecords];

  if (changed.length === 0) return run;

  const records = new Map(run.records);

  for (const record of changed) records.set(record.taskId, record);

  const next: ProgressRun = { ...run, records };

  return next;
};
