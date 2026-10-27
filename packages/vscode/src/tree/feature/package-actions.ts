import { join } from 'node:path';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import type { PackageActionPorts, TextSelection } from '../common/package-action.type.ts';
import { packageDirOf, packageTargetOf, taskNameOf } from '../utils/package-target.util.ts';
import { scriptSelectionOf } from '../utils/script-selection.util.ts';

/** The directory of the package row, or task row of it, `arg` is; `null` for any other argument or a package the model dropped. */
const directoryOf = (roots: Roots, arg: unknown): string | null => {
  const target = packageTargetOf(arg);

  if (target === null) return null;

  const state = roots.get(target.root)?.state;

  return packageDirOf(target, state);
};

/** The selection of script `name` in `file`, read as the editor holds it; `null` for no name, no readable file or no such script. */
const selectionOf = async (ports: PackageActionPorts, file: string, name: string | null): Promise<TextSelection | null> => {
  if (name === null) return null;

  const text = await ports.read(file);

  if (text === null) return null;

  return scriptSelectionOf(text, name);
};

/**
 * Spec §4.6.2: opens the package's `package.json` from a package or task row. A task row also selects and reveals its script's
 * property (a turbo task and its script share a name); a task with no script in the file leaves the file open at the top.
 */
const openPackageJson = async (roots: Roots, ports: PackageActionPorts, arg: unknown): Promise<void> => {
  const target = packageTargetOf(arg);

  if (target === null) return;

  const state = roots.get(target.root)?.state;
  const directory = packageDirOf(target, state);

  if (directory === null) return;

  const file = join(directory, 'package.json');
  const name = taskNameOf(arg, target, state);
  const selection = await selectionOf(ports, file, name);

  await ports.open(file, selection);
};

/** Spec §4.6.2: reveals the package directory in the Explorer. */
const revealInExplorer = async (roots: Roots, ports: PackageActionPorts, arg: unknown): Promise<void> => {
  const directory = directoryOf(roots, arg);

  if (directory !== null) await ports.reveal(directory);
};

/** Spec §4.6.2: copies the absolute package directory. */
const copyPath = async (roots: Roots, ports: PackageActionPorts, arg: unknown): Promise<void> => {
  const directory = directoryOf(roots, arg);

  if (directory !== null) await ports.copy(directory);
};

/** Registers the three package row actions; `dispose` undoes all of it. */
export const registerPackageActions = (roots: Roots, ports: PackageActionPorts, register: CommandRegistry): Disposed => {
  const open = async (arg: unknown): Promise<void> => openPackageJson(roots, ports, arg);
  const reveal = async (arg: unknown): Promise<void> => revealInExplorer(roots, ports, arg);
  const copy = async (arg: unknown): Promise<void> => copyPath(roots, ports, arg);
  const commands = [
    register('turboConsole.openPackageJson', open),
    register('turboConsole.revealInExplorer', reveal),
    register('turboConsole.copyPath', copy)
  ];
  const dispose = (): void => {
    for (const command of commands) command.dispose();
  };
  const registered: Disposed = { dispose };

  return registered;
};
