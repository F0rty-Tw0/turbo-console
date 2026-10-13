import { SKIP_INFER } from '../../shared/turbo/common/turbo-args.const.ts';
import { assertFilterName, assertTaskName } from '../../shared/turbo/utils/turbo-name.util.ts';
import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';
import type { RunAllOptions } from '../common/run-args.type.ts';

/** The arguments for running one task of one package, ready for `vscode.ProcessExecution`. */
export const turboRunArgs = (task: TaskNode, packageName: string): string[] => {
  assertTaskName(task.name);
  assertFilterName(packageName);

  const args = [SKIP_INFER, 'run', task.name, `--filter=${packageName}`, '--summarize'];

  return args;
};

/** The arguments for running a task name across every package, or only the affected ones. */
export const turboRunAllArgs = (taskName: string, options: RunAllOptions): string[] => {
  assertTaskName(taskName);

  const args = [SKIP_INFER, 'run', taskName];

  if (options.affected) args.push('--affected');

  return args;
};
