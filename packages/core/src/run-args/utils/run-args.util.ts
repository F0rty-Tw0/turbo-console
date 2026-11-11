import { assertRunExtras } from './run-extras.util.ts';
import { SINGLE_PACKAGE, SKIP_INFER } from '../../shared/turbo/common/turbo-args.const.ts';
import { assertFilterName, assertTaskName } from '../../shared/turbo/utils/turbo-name.util.ts';
import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';
import type { RunAllOptions, RunTaskOptions } from '../common/run-args.type.ts';

const NO_FORCE: RunTaskOptions = { force: false };

/**
 * The words a run's options add after the base and `--single-package`, in turbo's fixed order: `--force`, `--only`,
 * `--continue=<mode>`, `--concurrency=<value>`, then `--` and the pass-through args. No check; `turboRunArgs` checks first.
 */
export const turboOptionArgs = (options: RunTaskOptions): string[] => {
  const args: string[] = [];

  if (options.force) args.push('--force');

  if (options.only === true) args.push('--only');

  if (options.continueMode !== undefined) args.push(`--continue=${options.continueMode}`);

  if (options.concurrency !== undefined) args.push(`--concurrency=${options.concurrency}`);

  const passThrough = options.passThrough ?? [];

  if (passThrough.length > 0) args.push('--', ...passThrough);

  return args;
};

/**
 * The arguments for running one task of one package, ready for `vscode.ProcessExecution`; `singlePackage` adds
 * `--single-package`, then `--force`, `--only`, `--continue`, `--concurrency` and `--` with the args follow it. Throws
 * `invalid-argument` on a bad task or package name, concurrency or pass-through arg.
 */
export const turboRunArgs = (
  task: TaskNode,
  packageName: string,
  options: RunTaskOptions = NO_FORCE,
  singlePackage = false
): string[] => {
  assertTaskName(task.name);
  assertFilterName(packageName);
  assertRunExtras(options);

  const args = [SKIP_INFER, 'run', task.name, `--filter=${packageName}`, '--summarize'];

  if (singlePackage) args.push(SINGLE_PACKAGE);

  const optionWords = turboOptionArgs(options);

  args.push(...optionWords);

  return args;
};

/** The arguments for running a task name across every package, or only the affected ones; `singlePackage` adds `--single-package`. */
export const turboRunAllArgs = (taskName: string, options: RunAllOptions, singlePackage = false): string[] => {
  assertTaskName(taskName);

  const args = [SKIP_INFER, 'run', taskName];

  if (options.affected) args.push('--affected');

  if (singlePackage) args.push(SINGLE_PACKAGE);

  return args;
};
