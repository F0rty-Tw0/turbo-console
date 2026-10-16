import type { Disposable } from 'vscode';

/** The part of `vscode.Memento` the scope toggle uses. */
export type ScopeStore = {
  readonly get: (key: string) => unknown;
  readonly update: (key: string, value: boolean) => Thenable<void>;
};

/** The part of `vscode.ExtensionContext` that `registerTree` uses, so a spec builds it without a cast. */
export type TreeContext = {
  readonly subscriptions: Disposable[];
  readonly workspaceState: ScopeStore;
};
