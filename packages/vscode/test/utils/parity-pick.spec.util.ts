import * as vscode from 'vscode';

import { sleep, waitFor } from './suite-env.spec.util.ts';
import { manifestTree } from './tree-walk.spec.util.ts';
import type { ShownManifest, ShownPackage } from '../common/launch.type.ts';
import { BUILD_TASK } from '../common/parity.const.ts';
import type { PickStep } from '../common/parity.type.ts';

/** Spec §5.3 case 8: how long a quick pick gets to open before the suite sends it a key, and to finish after the last one. */
const PICK_OPEN_MS = 200;

const PICK_FINISH_MS = 10_000;

const taskNameOf = (packageName: string, id: string): string => id.slice(packageName.length + 1);

/** The id of the `build` task of `pkg`. */
export const buildId = (pkg: ShownPackage): string => `${pkg.name}#${BUILD_TASK}`;

/** The shown task names of package `name`, in the order the package pick lists them (code-unit order, as the extension sorts). */
export const taskNamesOf = (manifest: ShownManifest, name: string): string[] => {
  const { tasks } = manifestTree(manifest);
  const ids = tasks[name] ?? [];
  const names = ids.map((id) => taskNameOf(name, id));

  return names.toSorted();
};

/** Every shown task name once, in the order the palette picker lists them. */
export const allTaskNames = (manifest: ShownManifest): string[] => {
  const { tasks } = manifestTree(manifest);
  const names = Object.keys(tasks).flatMap((name) => taskNamesOf(manifest, name));
  const unique = new Set(names);

  const listed = [...unique];

  return listed.toSorted();
};

/** The packages with a shown task `task`, in the order the package pick lists them. */
export const packagesWith = (manifest: ShownManifest, task: string): string[] => {
  const { tasks } = manifestTree(manifest);
  const names = Object.keys(tasks);
  const hasTask = (name: string): boolean => taskNamesOf(manifest, name).includes(task);

  return names.filter(hasTask).toSorted();
};

/** The palette's task pick with `build` wanted. */
export const buildStepOf = (manifest: ShownManifest): PickStep => {
  const pick: PickStep = { list: allTaskNames(manifest), wanted: BUILD_TASK };

  return pick;
};

/** Moves the highlight of the open quick pick down to the wanted row of the list, then accepts it. */
const choose = async (step: PickStep, factor: number): Promise<void> => {
  const index = step.list.indexOf(step.wanted);

  if (index < 0) throw new Error(`${step.wanted} is not in the quick pick: ${step.list.join(', ')}`);

  await sleep(PICK_OPEN_MS * factor);

  for (let moved = 0; moved < index; moved += 1) await vscode.commands.executeCommand('workbench.action.quickOpenSelectNext');

  await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
};

/**
 * Starts `command` without awaiting it, accepts the wanted row of each quick pick it opens in turn, then waits for the
 * command to finish. The picks are driven through VS Code's quick-open commands, as a user's keys would. A pick that
 * never opened, or a command that never finishes, closes the quick pick (which settles the pending `showQuickPick` with
 * `undefined`) and fails with the command named, instead of hanging.
 */
export const runPicked = async (command: string, steps: PickStep[], factor: number): Promise<void> => {
  let isDone = false;

  const finished = Promise.resolve(vscode.commands.executeCommand(command)).finally(() => {
    isDone = true;
  });

  try {
    for (const step of steps) await choose(step, factor);

    await waitFor(`${command} to finish`, () => isDone, PICK_FINISH_MS * factor);
  } catch (error) {
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');

    void finished.catch(() => undefined);

    throw new Error(`${command} did not complete: ${String(error)}`, { cause: error });
  }

  await finished;
};
