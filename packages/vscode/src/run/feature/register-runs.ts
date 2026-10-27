import type { RootState, Roots } from '../../roots/common/coordinator.type.ts';
import type { PackagesTreeApi } from '../../tree/common/tree-node.type.ts';
import type { CommandRegistry, Disposed, RunControl, TaskTarget } from '../common/run.type.ts';
import { hasScriptBody } from '../utils/run-refusal.util.ts';
import { directRequestOf, runRequestOf, taskTargetOf } from '../utils/run-target.util.ts';
import { noScriptText } from '../utils/run-text.util.ts';
import { whenRunnable } from '../utils/runnable.util.ts';

type Info = (text: string) => void;

/** The state of the root of `target` once it can run: a cached model published before the binary waits for its load to settle. */
const runnableStateOf = async (roots: Roots, target: TaskTarget): Promise<RootState | undefined> => {
  const entry = roots.get(target.definition.root);

  if (entry?.state.binary === null) await whenRunnable(roots, target.definition.root, entry.coordinator);

  return roots.get(target.definition.root)?.state;
};

/**
 * UB4 Run Without Turbo on a task row: the task's package script through the package manager, the script-row launch.
 * A task with no script body (umbrella and aggregate rows, a blank body) gets `noScriptText` through `info`, and nothing runs.
 */
const runWithoutTurbo = async (control: RunControl, roots: Roots, info: Info, arg: unknown): Promise<void> => {
  const target = taskTargetOf(arg);

  if (target === null) return;

  const state = await runnableStateOf(roots, target);
  const request = runRequestOf(target, state, false);

  if (request === null) return;

  const hasBody = hasScriptBody(request.task);

  if (!hasBody) {
    const text = noScriptText(request.task.name);

    info(text);

    return;
  }

  const direct = directRequestOf(request);

  await control.run(direct);
};

/**
 * Spec §4.5 entry points: Run Task, Run Task Without Cache, Run Without Turbo and Stop Task on a task row (any other
 * argument is ignored), a tree row refresh on every change of a run, and the pruning of ended runs when a root reloads.
 * `dispose` undoes all of it.
 */
export const registerRuns = (
  control: RunControl,
  tree: Pick<PackagesTreeApi, 'runChanged'>,
  roots: Roots,
  register: CommandRegistry,
  info: Info
  // eslint-disable-next-line max-params -- the run inputs plus the toast extension.ts passes, one line there
): Disposed => {
  const runOn = async (arg: unknown, force: boolean): Promise<void> => {
    const target = taskTargetOf(arg);

    if (target === null) return;

    const state = await runnableStateOf(roots, target);
    const request = runRequestOf(target, state, force);

    if (request !== null) await control.run(request);
  };
  const runTask = async (arg: unknown): Promise<void> => runOn(arg, false);
  const runTaskWithoutCache = async (arg: unknown): Promise<void> => runOn(arg, true);
  const runTaskWithoutTurbo = async (arg: unknown): Promise<void> => runWithoutTurbo(control, roots, info, arg);
  const stopTask = (arg: unknown): void => {
    const target = taskTargetOf(arg);

    if (target !== null) control.stop(target.definition);
  };
  const commands = [
    register('turboConsole.runTask', runTask),
    register('turboConsole.runTaskWithoutCache', runTaskWithoutCache),
    register('turboConsole.runTaskWithoutTurbo', runTaskWithoutTurbo),
    register('turboConsole.stopTask', stopTask)
  ];
  const unsubscribeRuns = control.runs.onDidChange((entry) => {
    tree.runChanged(entry);
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
