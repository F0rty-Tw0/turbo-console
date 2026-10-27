import { readFile, stat } from 'node:fs/promises';

import * as vscode from 'vscode';

import type { IconThemePorts } from '../common/icon-theme.type.ts';

const themeIdOf = (): string | null => {
  const workbench = vscode.workspace.getConfiguration('workbench');
  const id = workbench.get<unknown>('iconTheme');

  if (typeof id === 'string') return id;

  return null;
};

const sizeOf = async (path: string): Promise<number> => {
  const stats = await stat(path);

  return stats.size;
};

/** The editor and disk reads of the icon theme lookup: `workbench.iconTheme`, the installed extensions, and a file's size and bytes. */
export const editorIconThemePorts = (): IconThemePorts => {
  const ports: IconThemePorts = {
    themeId: themeIdOf,
    extensions: () => [...vscode.extensions.all],
    size: sizeOf,
    read: async (path) => readFile(path)
  };

  return ports;
};
