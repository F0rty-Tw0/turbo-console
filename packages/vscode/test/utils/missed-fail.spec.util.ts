import { readSummary, summaryNames } from './run-wait.spec.util.ts';
import { log, sleep } from './suite-env.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';

/** Roadmap C49d: a missed fail run reads the summaries again after at least this long. */
const SUMMARY_SETTLE_MS = 2000;

/** Roadmap C49d: and polls this long at most for turbo's summary when none was written yet (Windows CI runs 3-5x slower). */
const SUMMARY_WAIT_MS = 10_000;

const SUMMARY_POLL_MS = 500;

const sinceLaunchText = (at: number | null, launchedAt: number): string => {
  if (at === null) return 'none';

  return `${at - launchedAt} ms`;
};

const freshNamesOf = async (root: string, before: string[]): Promise<string[]> => {
  const names = await summaryNames(root);

  return names.filter((name) => !before.includes(name));
};

const summaryLineOf = async (root: string, name: string, entry: RunEntry): Promise<string> => {
  try {
    const { execution, tasks } = await readSummary(root, name);
    const task = tasks.find((listed) => listed.taskId === entry.taskId);
    const taskExit = task?.execution.exitCode ?? 'not listed';
    const start = sinceLaunchText(execution.startTime, entry.launchedAt);
    const end = sinceLaunchText(execution.endTime, entry.launchedAt);

    return `${name}: ${execution.command}, exit ${execution.exitCode}, ${entry.taskId} exit ${taskExit}, start ${start}, end ${end} after the click`;
  } catch (error) {
    return `${name}: unreadable (${String(error)})`;
  }
};

const logSummaries = async (root: string, entry: RunEntry, before: string[], when: string): Promise<void> => {
  const fresh = await freshNamesOf(root, before);
  const lines = await Promise.all(fresh.map(async (name) => summaryLineOf(root, name, entry)));

  log(`C49d ${when}: ${lines.length} summaries since the click`);

  for (const line of lines) log(`C49d ${when}: ${line}`);
};

/** Waits `SUMMARY_SETTLE_MS`, then until a summary since `before` exists or `SUMMARY_WAIT_MS` passed; returns the ms waited. */
const settleSummaries = async (root: string, before: string[]): Promise<number> => {
  const startedAt = Date.now();

  await sleep(SUMMARY_SETTLE_MS);

  while (Date.now() - startedAt < SUMMARY_WAIT_MS) {
    const fresh = await freshNamesOf(root, before);

    if (fresh.length > 0) break;

    await sleep(SUMMARY_POLL_MS);
  }

  return Date.now() - startedAt;
};

/**
 * Roadmap C49d: logs what a fail run that did not end failed saw (the exit VS Code gave, when the run ended and its
 * process started, every summary written since `before` at once and again once turbo had time to write it; times are
 * ms after the click), so the next hit shows whether VS Code ended the run early with 0 or at its real end with a wrong
 * code.
 */
export const logMissedFail = async (root: string, entry: RunEntry, before: string[]): Promise<void> => {
  const { launchedAt } = entry;
  const ended = sinceLaunchText(entry.endedAt, launchedAt);
  const started = sinceLaunchText(entry.processStartedAt, launchedAt);

  log(`C49d: clicked at ${launchedAt}, exitCode ${entry.exitCode}, ended ${ended}, process start ${started} after the click`);
  await logSummaries(root, entry, before, 'at end');

  const waitedMs = await settleSummaries(root, before);

  await logSummaries(root, entry, before, `after ${waitedMs} ms`);
};
