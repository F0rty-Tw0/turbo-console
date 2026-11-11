import type * as vscode from 'vscode';

import { AffectedToggle } from './affected-toggle.ts';
import { PredictionToggle } from './prediction-toggle.ts';
import { ScopeToggle } from './scope-toggle.ts';
import { ScriptsToggle } from './scripts-toggle.ts';
import type { Output } from '../common/output.type.ts';
import type { Disposing, Toggles } from '../common/scripts-toggle.type.ts';
import { editorTogglePorts } from '../data-access/scripts-toggle-ports.ts';

/** The scripts, scope, prediction and affected toggles, all on the window's `workspaceState` through one ports object. */
export const togglesOf = (state: vscode.Memento, output: Output): Toggles => {
  const ports = editorTogglePorts(state, output);
  const toggles: Toggles = {
    scripts: new ScriptsToggle(ports),
    scope: new ScopeToggle(ports),
    prediction: new PredictionToggle(ports),
    affected: new AffectedToggle(ports)
  };

  return toggles;
};

/** Every toggle as one subscription, so a new toggle needs no new item in `activate`'s subscription list. */
export const togglesDisposableOf = (toggles: Toggles): Disposing => {
  const dispose = (): void => {
    for (const toggle of Object.values(toggles)) toggle.dispose();
  };
  const disposing: Disposing = { dispose };

  return disposing;
};
