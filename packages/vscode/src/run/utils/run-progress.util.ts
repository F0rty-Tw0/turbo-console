import { eventRunOf } from './run-progress-event.util.ts';
import type { ProgressInput, ProgressRecord, ProgressRun, ProgressState } from '../common/run-progress.type.ts';
import type { RunEntry } from '../common/run.type.ts';

const absentStateOf = (entry: RunEntry): ProgressState | null => {
  if (entry.state === 'passed') return 'passed';

  const isCut = entry.state === 'stopped' || entry.outcomes !== null;

  return isCut ? 'stopped' : null;
};

const cutRecordsOf = (run: ProgressRun, entry: RunEntry, at: number): Map<string, ProgressRecord> => {
  const absentState = absentStateOf(entry);
  const records = new Map(run.records);

  for (const record of run.records.values()) {
    if (record.state !== 'running') continue;

    if (absentState === null) {
      records.delete(record.taskId);
      continue;
    }

    const cut: ProgressRecord = { ...record, state: absentState, at };

    records.set(record.taskId, cut);
  }

  return records;
};

const settledRunOf = (run: ProgressRun, entry: RunEntry): ProgressRun => {
  const at = entry.endedAt;

  if (at === null) return run;

  const records = cutRecordsOf(run, entry, at);
  const outcomes = entry.outcomes ?? [];

  for (const outcome of outcomes) {
    if (outcome.taskId === run.owner.taskId) continue;

    const ended: ProgressRecord = { owner: run.owner, taskId: outcome.taskId, state: outcome.state, at };

    records.set(outcome.taskId, ended);
  }

  const settled: ProgressRun = { ...run, records, settled: true };

  return settled;
};

/**
 * The run after one input (spec §5.1, D8): a log line moves records by `eventRunOf`; a settle at the owner's end writes
 * every summary outcome but the owner's own, settles each still-running record by the entry (`passed` entry → passed,
 * `stopped` entry or outcomes present → stopped, else removed), keeps the other records, and marks the run settled.
 * Returns `run` itself when nothing changes: a line that moves no record, or a settle whose entry has not ended.
 */
export const progressRunOf = (run: ProgressRun, input: ProgressInput): ProgressRun => {
  if (input.kind === 'event') return eventRunOf(run, input.event, input.at);

  return settledRunOf(run, input.entry);
};
