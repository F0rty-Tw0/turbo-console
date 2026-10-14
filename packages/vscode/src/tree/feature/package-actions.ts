import { join } from 'node:path';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import type { PackageActionPorts } from '../common/package-action.type.ts';
import { packageDirOf, packageTargetOf } from '../utils/package-target.util.ts';

/** The directory of the package row, or task row of it, `arg` is; `null` for any other argument or a package the model dropped. */
const directoryOf = (roots: Roots, arg: unknown): string | null => {
  const target = packageTargetOf(arg);

  if (target === null) return null;

  const state = roots.get(target.root)?.state;

  return packageDirOf(target, state);
};

/** Spec §4.6.2: opens the package's `package.json` from a package or task row. */
const openPackageJson = async (roots: Roots, ports: PackageActionPorts, arg: unknown): Promise<void> => {
  const directory = directoryOf(roots, arg);

  if (directory !== null) await ports.open(join(directory, 'package.json'));
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
