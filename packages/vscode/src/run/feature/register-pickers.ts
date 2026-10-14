import * as vscode from 'vscode';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { PickItem, PickerPorts } from '../common/picker.type.ts';
import type { CommandRegistry, Disposed, RunControl } from '../common/run.type.ts';
import { pickAndRun } from '../domain-logic/pick-and-run.ts';
import { pickForFileAndRun } from '../domain-logic/pick-for-file.ts';

const quickPick = async (items: PickItem[], placeHolder: string): Promise<PickItem | undefined> =>
  vscode.window.showQuickPick(items, { placeHolder });

const fileOf = (uri: vscode.Uri | undefined): string | null => {
  if (uri?.scheme !== 'file') return null;

  return uri.fsPath;
};

/**
 * The manifest the command was invoked on: the resource the editor title or context menu passes, else the active
 * editor's file. `null` for neither, or a document that is not a file (untitled, a virtual scheme).
 */
const manifestFile = (arg: unknown): string | null => {
  if (arg instanceof vscode.Uri) return fileOf(arg);

  return fileOf(vscode.window.activeTextEditor?.document.uri);
};

const rootOf = (file: string): string | null => {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(file));

  return folder?.uri.fsPath ?? null;
};

/**
 * Spec §4.6.1 and §4.6.4 entry points: Run Task… from the palette and Run Turbo Task… on an open `package.json`. Both
 * end in the run flow of `control`, so the "Already running." guard and the watchdog apply unchanged.
 */
export const registerPickers = (control: RunControl, roots: Roots, register: CommandRegistry): Disposed => {
  const ports: PickerPorts = {
    rootOf,
    ensureLoaded: async (root) => {
      await roots.get(root)?.coordinator.ensureLoaded();
    },
    pick: quickPick,
    info: (text) => {
      void vscode.window.showInformationMessage(text);
    },
    run: async (request) => control.run(request)
  };
  const runTaskPicker = async (): Promise<void> => pickAndRun(roots, ports);
  const runPackageTask = async (arg: unknown): Promise<void> => pickForFileAndRun(roots, ports, manifestFile(arg));
  const commands = [register('turboConsole.runTaskPicker', runTaskPicker), register('turboConsole.runPackageTask', runPackageTask)];
  const dispose = (): void => {
    for (const command of commands) command.dispose();
  };
  const registered: Disposed = { dispose };

  return registered;
};
