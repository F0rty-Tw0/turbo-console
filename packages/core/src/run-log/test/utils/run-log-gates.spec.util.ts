import { taskNodeOf } from './run-log-turbo.spec.util.ts';
import { turboRunArgs } from '../../../run-args/utils/run-args.util.ts';
import type { RunToMatch } from '../../../run-summary/common/run-match.type.ts';
import type { RunSummary } from '../../../shared/turbo/common/turbo.type.ts';
import type { RunLogEntry } from '../../common/run-log.type.ts';
import { RUN_LOG_DIR_STUB } from '../stubs/run-log-fixture.stub.ts';

/** The repo-relative log path of run `name`, as `TURBO_LOG_FILE` and `--log-file` take it. */
export const logOf = (name: string): string => `${RUN_LOG_DIR_STUB}/run-${name}.json`;

/** The env that makes turbo write the structured log to the repo-relative `path`. */
export const logEnvOf = (path: string): Record<string, string> => {
  const env: Record<string, string> = {};

  env['TURBO_LOG_FILE'] = path;

  return env;
};

/** The argv turbo-console runs `<packageName>#<taskName>` with. */
export const argsOf = (packageName: string, taskName: string): string[] => {
  const task = taskNodeOf(packageName, taskName);
  const args = turboRunArgs(task, packageName);

  return args;
};

/** The run `matchRunSummary` takes for `<packageName>#<taskName>`, launched at `launchedAt` and ended now. */
export const runToMatchOf = (packageName: string, taskName: string, launchedAt: number, exitCode: number): RunToMatch => {
  const run: RunToMatch = { task: taskNodeOf(packageName, taskName), packageName, launchedAt, endedAt: Date.now(), exitCode };

  return run;
};

/** The cache status `summary` records for `taskId`; `undefined` when it lists no such task. */
export const cacheStatusOf = (summary: RunSummary | null, taskId: string): string | undefined =>
  summary?.tasks.find((task) => task.taskId === taskId)?.cache.status;

/** The source of every entry, in log order. */
export const sourcesOf = (entries: RunLogEntry[]): string[] => entries.map((entry) => entry.source);
