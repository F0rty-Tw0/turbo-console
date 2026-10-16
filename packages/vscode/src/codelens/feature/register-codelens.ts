import * as vscode from 'vscode';

import type { RootState, Roots } from '../../roots/common/coordinator.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import { LENS_COMMAND } from '../common/codelens.const.ts';
import type { LensDocument } from '../common/codelens.type.ts';
import { lensSpecOf } from '../utils/lens-spec.util.ts';

const SELECTOR: vscode.DocumentSelector = { language: 'json', scheme: 'file', pattern: '**/package.json' };

type LensScripts = Pick<ScriptsToggleApi, 'isShown' | 'onDidChange'>;

const stateOf = (roots: Roots, document: LensDocument): RootState | undefined => {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);

  if (folder === undefined) return undefined;

  return roots.get(folder.uri.fsPath)?.state;
};

/** Reads the loaded state and the open document only: no load is awaited and no file is read. */
const lensesOf = (roots: Roots, scripts: LensScripts, document: LensDocument): vscode.CodeLens[] => {
  const state = stateOf(roots, document);
  const spec = lensSpecOf(document.getText(), document.uri.fsPath, state, scripts.isShown());

  if (spec === null) return [];

  const range = new vscode.Range(spec.line, 0, spec.line, 0);
  const command: vscode.Command = { title: spec.title, command: LENS_COMMAND, arguments: [document.uri] };

  return [new vscode.CodeLens(range, command)];
};

/**
 * Spec 1c-b §4.11: the "▷ Tasks: …" lens above the `"scripts"` key of every owned `package.json`; it opens that package's
 * Run Turbo Task… pick. It refreshes on every root store change and on every scripts toggle change.
 */
export const registerCodeLens = (roots: Roots, scripts: LensScripts): vscode.Disposable => {
  const changes = new vscode.EventEmitter<void>();
  const refresh = (): void => {
    changes.fire();
  };
  const unsubscribeRoots = roots.onDidChange(refresh);
  const unsubscribeScripts = scripts.onDidChange(refresh);
  const provideCodeLenses = (document: LensDocument): vscode.CodeLens[] => lensesOf(roots, scripts, document);
  const provider: vscode.CodeLensProvider = { onDidChangeCodeLenses: changes.event, provideCodeLenses };
  const registration = vscode.languages.registerCodeLensProvider(SELECTOR, provider);
  const dispose = (): void => {
    unsubscribeRoots();
    unsubscribeScripts();
    registration.dispose();
    changes.dispose();
  };
  const registered: vscode.Disposable = { dispose };

  return registered;
};
