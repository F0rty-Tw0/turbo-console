import { join } from 'node:path';

import * as vscode from 'vscode';

import { packageDirOf } from './package-edit.spec.util.ts';
import { LENS_COMMAND_ID } from '../common/scripts.const.ts';

const COUNT_IN_TITLE = /\((\d+)\)$/u;

const isTasksLens = (lens: vscode.CodeLens): boolean => lens.command?.command === LENS_COMMAND_ID;

const titleOf = (lens: vscode.CodeLens): string => lens.command?.title ?? '';

/** The titles of the Tasks lenses VS Code collects over the file `file` (`vscode.executeCodeLensProvider`, which needs the document's model open). */
export const lensTitlesOf = async (file: string): Promise<string[]> => {
  const uri = vscode.Uri.file(file);

  await vscode.workspace.openTextDocument(uri);

  const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', uri);
  const own = lenses.filter(isTasksLens);

  return own.map(titleOf);
};

/** The lens titles over the `package.json` of package `name`. */
export const packageLensTitles = async (root: string, name: string): Promise<string[]> => {
  const dir = await packageDirOf(root, name);

  return lensTitlesOf(join(dir, 'package.json'));
};

/** The `(N)` that ends a lens title; throws for a title without one. */
export const lensCountOf = (title: string): number => {
  const count = COUNT_IN_TITLE.exec(title)?.[1];

  if (count === undefined) throw new Error(`lens title has no count: ${title}`);

  return Number(count);
};
