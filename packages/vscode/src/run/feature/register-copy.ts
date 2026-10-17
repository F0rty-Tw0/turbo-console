import { join } from 'node:path';

import { TurboException } from '@turbo-console/core';
import type { TaskNode, WorkspaceModel } from '@turbo-console/core';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import { NAME_NOT_COPYABLE_TEXT, SHELL_NOT_COPYABLE_TEXT } from '../common/copy.const.ts';
import type { CopyPorts } from '../common/copy.type.ts';
import type { CommandRegistry, Disposed, TaskTarget } from '../common/run.type.ts';
import type { ShellKind } from '../common/shell.type.ts';
import { scriptCopiedText } from '../utils/copy-text.util.ts';
import { isScriptSourceSafe } from '../utils/run-refusal.util.ts';
import { modelTaskOf, packageOf, taskTargetOf } from '../utils/run-target.util.ts';
import { unsafeScriptText } from '../utils/run-text.util.ts';
import { scriptCommandOf } from '../utils/script-name.util.ts';
import { copyText, shellKindOf } from '../utils/shell-quote.util.ts';

/** The text to copy; `null` after an info message says why a task, in this shell, has none. Other errors propagate. */
const textOf = (ports: CopyPorts, task: TaskNode, packageName: string, kind: ShellKind): string | null => {
  try {
    const text = copyText(task, packageName, kind);

    if (text === null) ports.info(SHELL_NOT_COPYABLE_TEXT);

    return text;
  } catch (error) {
    if (!(error instanceof TurboException)) throw error;

    ports.info(NAME_NOT_COPYABLE_TEXT);

    return null;
  }
};

/**
 * Spec 1c-b §4.6: a script copies `<manager> run <name>` and the info says where to run it. What Run refuses copies
 * nothing: a name that needs quoting, an empty body, or a package dir outside the root.
 */
const copyScript = async (ports: CopyPorts, target: TaskTarget, task: TaskNode, model: WorkspaceModel): Promise<void> => {
  const packagePath = packageOf(target, model)?.path ?? '';
  const packageDir = join(target.definition.root, packagePath);
  const isSafeSource = isScriptSourceSafe(task, target.definition.root, packageDir);
  const text = scriptCommandOf(model.packageManager.name, task.name);

  if (!isSafeSource || text === null) {
    ports.info(unsafeScriptText(task.name));

    return;
  }

  await ports.write(text);
  ports.info(scriptCopiedText(packagePath));
};

const copyTurbo = async (ports: CopyPorts, task: TaskNode, packageName: string): Promise<void> => {
  const kind = shellKindOf(ports.shell());
  const text = textOf(ports, task, packageName, kind);

  if (text !== null) await ports.write(text);
};

/** Spec §4.6.6: the command a user would type for the task row `arg`, quoted for their shell; any other argument is ignored. */
const copyCommand = async (roots: Roots, ports: CopyPorts, arg: unknown): Promise<void> => {
  const target = taskTargetOf(arg);

  if (target === null) return;

  const state = roots.get(target.definition.root)?.state;
  const task = modelTaskOf(target, state);
  const model = state?.model;

  if (task === undefined || model === null || model === undefined) return;

  if (task.isTurboTask) await copyTurbo(ports, task, target.packageName);
  else await copyScript(ports, target, task, model);
};

/** Registers Copy Command for the task rows; `dispose` undoes it. */
export const registerCopy = (roots: Roots, ports: CopyPorts, register: CommandRegistry): Disposed => {
  const copy = async (arg: unknown): Promise<void> => copyCommand(roots, ports, arg);

  return register('turboConsole.copyCommand', copy);
};
