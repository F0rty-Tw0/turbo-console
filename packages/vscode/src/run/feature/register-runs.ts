import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { PackagesTreeApi } from '../../tree/common/tree-node.type.ts';
import type { CommandRegistry, Disposed, RunControl } from '../common/run.type.ts';
import { runRequestOf, taskTargetOf } from '../utils/run-target.util.ts';

/**
 * Spec §4.5 entry points: Run Task and Stop Task on a task row (any other argument is ignored), a tree row refresh on
 * every change of a run, and the pruning of ended runs when a root reloads. `dispose` undoes all of it.
 */
export const registerRuns = (
  control: RunControl,
  tree: Pick<PackagesTreeApi, 'refreshTask'>,
  roots: Roots,
  register: CommandRegistry
): Disposed => {
  const runTask = async (arg: unknown): Promise<void> => {
    const target = taskTargetOf(arg);

    if (target === null) return;

    const state = roots.get(target.definition.root)?.state;
    const request = runRequestOf(target, state);

    if (request !== null) await control.run(request);
  };
  const stopTask = (arg: unknown): void => {
    const target = taskTargetOf(arg);

    if (target !== null) control.stop(target.definition);
  };
  const commands = [register('turboConsole.runTask', runTask), register('turboConsole.stopTask', stopTask)];
  const unsubscribeRuns = control.runs.onDidChange((entry) => {
    tree.refreshTask(entry.root, entry.taskId);
  });
  const unsubscribeRoots = roots.onDidChange((change) => {
    control.rootChanged(change);
  });
  const dispose = (): void => {
    for (const command of commands) command.dispose();

    unsubscribeRuns();
    unsubscribeRoots();
  };
  const registered: Disposed = { dispose };

  return registered;
};
