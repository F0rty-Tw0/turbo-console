import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { buildId } from './parity-pick.spec.util.ts';
import { taskNodeNamed } from './run-wait.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { ShownPackage } from '../common/launch.type.ts';
import type { ParityScene } from '../common/parity.type.ts';

const OPEN_LIMIT_MS = 10_000;

const BUILD_SCRIPT_LINE = /^\s*"build":/;

const BUILD_KEY_LENGTH = 'build'.length;

export const manifestFileOf = (root: string, pkg: ShownPackage): string => join(root, pkg.path, 'package.json');

/** The text of the active editor selection with the line it starts on; `null` for no editor or an empty selection. */
const selectedScriptOf = (editor: vscode.TextEditor | undefined): string | null => {
  if (editor === undefined) return null;

  const { selection, document } = editor;

  if (selection.isEmpty) return null;

  const selected = document.getText(selection);

  return `${selection.start.line}:${selected}`;
};

/** Renames the selected `"build"` key to `"builds"` in the open buffer, unsaved: the file on disk keeps `build`, the buffer no longer has it. */
const renameSelectedKey = async (editor: vscode.TextEditor): Promise<void> => {
  const { line, character } = editor.selection.start;
  const key = new vscode.Range(line, character + 1, line, character + 1 + BUILD_KEY_LENGTH);

  await editor.edit((builder) => {
    builder.replace(key, 'builds');
  });
};

/** Runs Open package.json on the leaf's `build` task row and returns the editor once it shows `file`. */
const openedOn = async (scene: ParityScene, file: string): Promise<vscode.TextEditor> => {
  const { api, pair, budgetFactor } = scene;
  const node = await taskNodeNamed(api, pair.leaf.name, buildId(pair.leaf));
  const expected = vscode.Uri.file(file).fsPath;
  const isShown = (): boolean => vscode.window.activeTextEditor?.document.uri.fsPath === expected;

  await vscode.commands.executeCommand('turboConsole.openPackageJson', node);
  await waitFor(`the editor of ${expected}`, isShown, OPEN_LIMIT_MS * budgetFactor);

  const editor = vscode.window.activeTextEditor;

  assert.ok(editor, `no editor shows ${expected}`);

  return editor;
};

/**
 * Open package.json on a task row selects that task's script; once the buffer holds no such script (edited, unsaved) it opens at
 * the top with nothing selected, so the earlier selection does not stay.
 */
export const openScriptCase = async (scene: ParityScene): Promise<void> => {
  const { root, pair, budgetFactor } = scene;
  const file = manifestFileOf(root, pair.leaf);

  await step('8: Open package.json on a task row selects that task script line', async () => {
    const text = await readFile(file, 'utf8');
    const line = text.split(/\r?\n/).findIndex((row) => BUILD_SCRIPT_LINE.test(row));
    const isSelected = (): boolean => selectedScriptOf(vscode.window.activeTextEditor)?.startsWith(`${line}:"build":`) === true;

    assert.notEqual(line, -1, `${file} has no build script line`);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await openedOn(scene, file);
    await waitFor(`the build script of ${file} selected`, isSelected, OPEN_LIMIT_MS * budgetFactor);
  });

  await step('8: Open package.json on a task row with no script clears the old selection and shows the top', async () => {
    const editor = await openedOn(scene, file);

    await renameSelectedKey(editor);
    assert.equal(editor.selection.isEmpty, false, 'the edited build key stays selected');
    await openedOn(scene, file);

    const isAtTop = (): boolean => editor.selection.isEmpty && editor.selection.start.line === 0;

    await waitFor(`an empty selection at the top of ${file}`, isAtTop, OPEN_LIMIT_MS * budgetFactor);
    await vscode.commands.executeCommand('workbench.action.files.revert');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
};
