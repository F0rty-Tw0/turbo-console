import type { Disposable } from 'vscode';

import type { IconThemeProbe } from './icon-theme.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';

/** The part of `vscode.Memento` the scope toggle uses. */
export type ScopeStore = {
  readonly get: (key: string) => unknown;
  readonly update: (key: string, value: boolean) => Thenable<void>;
};

/**
 * The part of `vscode.ExtensionContext` that `registerTree` uses, so a spec builds it without a cast, with the scripts toggle
 * and the icon theme's folder probe beside it.
 */
export type TreeContext = {
  readonly subscriptions: Disposable[];
  readonly workspaceState: ScopeStore;
  readonly scripts: ScriptsToggleApi;
  readonly iconTheme: IconThemeProbe;
};
