import type { DisplayedRun, ProgressRecord } from '../common/run-progress.type.ts';
import type { RunEntry, RunState } from '../common/run.type.ts';

const displayedRunOf = (state: RunState, owner: string | null): DisplayedRun => {
  const displayed: DisplayedRun = { state, owner };

  return displayed;
};

const isRunningRecord = (record: ProgressRecord): boolean => record.state === 'running';

const newerOwnerRecordOf = (kept: ProgressRecord, record: ProgressRecord): ProgressRecord => {
  const isNewer = record.owner.launchedAt > kept.owner.launchedAt;

  return isNewer ? record : kept;
};

const laterRecordOf = (kept: ProgressRecord, record: ProgressRecord): ProgressRecord => {
  if (record.at === kept.at) return newerOwnerRecordOf(kept, record);

  const isLater = record.at > kept.at;

  return isLater ? record : kept;
};

const settledStateOf = (own: RunEntry | undefined, records: ProgressRecord[]): RunState | null => {
  if (records.length === 0) return own?.state ?? null;

  const latest = records.reduce(laterRecordOf);

  if (own === undefined) return latest.state;

  const ownAt = own.endedAt ?? own.launchedAt;
  const isOwnLatest = ownAt >= latest.at;

  return isOwnLatest ? own.state : latest.state;
};

/**
 * The run state one task id shows (spec §5.2, D9), rules in order: the own run while it runs (a script run too);
 * else the newest-launched run that runs the id, as owner; else the latest of the own entry and the records, the own
 * entry winning a tie and the newer owner run winning a tie between records; `null` with neither.
 */
export const displayRunOf = (own: RunEntry | undefined, records: ProgressRecord[]): DisplayedRun | null => {
  if (own?.state === 'running') return displayedRunOf('running', null);

  const running = records.filter(isRunningRecord);

  if (running.length > 0) {
    const newest = running.reduce(newerOwnerRecordOf);

    return displayedRunOf('running', newest.owner.taskId);
  }

  const state = settledStateOf(own, records);

  if (state === null) return null;

  return displayedRunOf(state, null);
};
