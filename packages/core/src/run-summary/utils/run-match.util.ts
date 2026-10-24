import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import type { TaskNodeKind } from '../../workspace/common/workspace-model.type.ts';
import type { RunMatch, RunToMatch } from '../common/run-match.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { SUMMARY_MTIME_SLACK_MS } from '../common/run-summary.const.ts';

type Span = {
  readonly startTime: number;
  readonly endTime: number;
};

/** Kinds turbo never records as an entry of their own: only their file tasks and dependencies appear in `tasks`. */
const ENTRYLESS_KINDS: TaskNodeKind[] = ['atom-aggregate', 'atom-umbrella'];

/**
 * The command turbo records for `run`. Names are written verbatim, never quoted, so two different (task, package) pairs
 * can give the same string: `taskId` tells them apart for a task with its own entry, the time window for the rest.
 */
export const runCommandOf = (run: RunToMatch): string => `turbo run ${run.task.name} --filter=${run.packageName}`;

const spanOf = (span: Span): number => span.endTime - span.startTime;

/** A real duration: finite and not negative. A broken summary can give `endTime < startTime` or an overflow. */
export const isRealDuration = (durationMs: number): boolean => Number.isFinite(durationMs) && durationMs >= 0;

/** Whether `file` was written within `SUMMARY_MTIME_SLACK_MS` of `[launchedAt, endedAt]`, so it may hold the summary of `run`. */
export const isNearRun = (file: RunSummaryFile, run: RunToMatch): boolean => {
  const from = run.launchedAt - SUMMARY_MTIME_SLACK_MS;
  const to = run.endedAt + SUMMARY_MTIME_SLACK_MS;

  return file.mtimeMs >= from && file.mtimeMs <= to;
};

const isCandidate = (summary: RunSummary, run: RunToMatch): boolean => {
  const { startTime, command, exitCode } = summary.execution;
  const isInWindow = startTime >= run.launchedAt && startTime <= run.endedAt;
  const isSameCommand = command === runCommandOf(run);
  const isSameExit = exitCode === run.exitCode;

  return isInWindow && isSameCommand && isSameExit;
};

const dataOf = (summary: RunSummary, run: RunToMatch): RunMatch | null => {
  const hasNoEntry = ENTRYLESS_KINDS.includes(run.task.kind);

  if (hasNoEntry) {
    const own: RunMatch = { cache: null, durationMs: spanOf(summary.execution) };

    return own;
  }

  const entry = summary.tasks.find((task) => task.taskId === run.task.id);

  if (entry === undefined) return null;

  const match: RunMatch = { cache: entry.cache.status, durationMs: spanOf(entry.execution) };

  return match;
};

/**
 * Spec §4.1.2: the data `summary` gives `run` when it fits: it started within `[launchedAt, endedAt]`, ran the same
 * command and ended with the same exit code, and, for a task with its own entry, lists that entry. The duration comes
 * from that entry, or from the whole summary for an umbrella or aggregate (`cache: null`). `null` when it does not fit
 * or the duration is not finite or is negative.
 */
export const matchSummary = (summary: RunSummary, run: RunToMatch): RunMatch | null => {
  const isRunCandidate = isCandidate(summary, run);

  if (!isRunCandidate) return null;

  const match = dataOf(summary, run);

  if (match === null) return null;

  const hasRealDuration = isRealDuration(match.durationMs);

  return hasRealDuration ? match : null;
};
