import type * as vscode from 'vscode';

import { ScopeToggle } from './scope-toggle.ts';
import { ScriptsToggle } from './scripts-toggle.ts';
import type { Output } from '../common/output.type.ts';
import type { Toggles } from '../common/scripts-toggle.type.ts';
import { editorTogglePorts } from '../data-access/scripts-toggle-ports.ts';

/** The scripts toggle and the scope toggle, both on the window's `workspaceState` through one ports object. */
export const togglesOf = (state: vscode.Memento, output: Output): Toggles => {
  const ports = editorTogglePorts(state, output);
  const toggles: Toggles = { scripts: new ScriptsToggle(ports), scope: new ScopeToggle(ports) };

  return toggles;
};
