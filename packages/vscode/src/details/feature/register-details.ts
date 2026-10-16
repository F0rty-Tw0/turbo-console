import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import { packageTargetOf } from '../../tree/utils/package-target.util.ts';
import type { PanelOpener } from '../common/panel.type.ts';

/**
 * Spec §4.3: `turboConsole.openPackageDetails` from a package row (its root and package name) or from a
 * `package.json` (the editor title and the palette, which refuse only with no model or a file no package owns: a
 * binary-stage error opens the panel, which shows the binary banner). `fileOf` is the run pickers' `manifestFile`: the
 * resource passed, else the active editor's file. `dispose` closes every panel.
 */
export const registerDetails = (panels: PanelOpener, register: CommandRegistry, fileOf: (arg: unknown) => string | null): Disposed => {
  const openDetails = async (arg: unknown): Promise<void> => {
    const target = packageTargetOf(arg);

    if (target === null) {
      await panels.openFile(fileOf(arg));

      return;
    }

    await panels.open(target);
  };
  const command = register('turboConsole.openPackageDetails', openDetails);
  const dispose = (): void => {
    command.dispose();
    panels.dispose();
  };
  const registered: Disposed = { dispose };

  return registered;
};
