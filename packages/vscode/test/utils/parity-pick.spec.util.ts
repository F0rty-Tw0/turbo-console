import * as vscode from 'vscode';

import { driveCommand } from './quick-input-drive.spec.util.ts';
import { sleep } from './suite-env.spec.util.ts';
import { manifestTree } from './tree-walk.spec.util.ts';
import type { ShownManifest, ShownPackage } from '../common/launch.type.ts';
import { BUILD_TASK } from '../common/parity.const.ts';
import type { PickStep } from '../common/parity.type.ts';

/** Spec §5.3 case 8: how long a quick pick gets to open before the suite sends it a key. */
const PICK_OPEN_MS = 200;

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

/** Runs `command`, accepts the wanted row of each quick pick it opens in turn, and waits for it to finish (`driveCommand`). */
export const runPicked = async (command: string, steps: PickStep[], factor: number): Promise<void> => {
  const moveOf = (step: PickStep): ((stepFactor: number) => Promise<void>) => {
    const move = async (stepFactor: number): Promise<void> => choose(step, stepFactor);

    return move;
  };
  const moves = steps.map(moveOf);

  await driveCommand(command, [], moves, factor);
};
