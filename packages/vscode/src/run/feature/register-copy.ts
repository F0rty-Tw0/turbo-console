import { TurboException } from '@turbo-console/core';
import type { TaskNode } from '@turbo-console/core';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import { NAME_NOT_COPYABLE_TEXT, NOT_TURBO_COPY_TEXT, SHELL_NOT_COPYABLE_TEXT } from '../common/copy.const.ts';
import type { CopyPorts } from '../common/copy.type.ts';
import type { CommandRegistry, Disposed } from '../common/run.type.ts';
import type { ShellKind } from '../common/shell.type.ts';
import { modelTaskOf, taskTargetOf } from '../utils/run-target.util.ts';
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

/** Spec §4.6.6: the command a user would type for the task row `arg`, quoted for their shell; any other argument is ignored. */
const copyCommand = async (roots: Roots, ports: CopyPorts, arg: unknown): Promise<void> => {
  const target = taskTargetOf(arg);

  if (target === null) return;

  const state = roots.get(target.definition.root)?.state;
  const task = modelTaskOf(target, state);

  if (task === undefined) return;

  if (!task.isTurboTask) {
    ports.info(NOT_TURBO_COPY_TEXT);

    return;
  }

  const kind = shellKindOf(ports.shell());
  const text = textOf(ports, task, target.packageName, kind);

  if (text !== null) await ports.write(text);
};

/** Registers Copy Command for the task rows; `dispose` undoes it. */
export const registerCopy = (roots: Roots, ports: CopyPorts, register: CommandRegistry): Disposed => {
  const copy = async (arg: unknown): Promise<void> => copyCommand(roots, ports, arg);

  return register('turboConsole.copyCommand', copy);
};
