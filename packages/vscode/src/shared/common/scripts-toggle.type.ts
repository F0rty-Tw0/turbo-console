/** The part of `vscode.Memento` a toggle uses. */
export type ToggleStore = {
  readonly get: (key: string) => unknown;
  readonly update: (key: string, value: boolean) => Thenable<void>;
};

/**
 * What a toggle needs from the editor: the `workspaceState` it stores the choice in, `setKey` mirroring it to the context
 * key it is given (the one the title-bar commands read), and `log` taking a finished line (`logTextOf`).
 */
export type ScriptsTogglePorts = {
  readonly store: ToggleStore;
  readonly setKey: (key: string, value: boolean) => Thenable<void>;
  readonly log: (line: string) => void;
};

/** The scripts toggle as the tree and the commands see it; `onDidChange` returns its unsubscribe. */
export type ScriptsToggleApi = {
  readonly isShown: () => boolean;
  readonly set: (value: boolean) => Promise<void>;
  readonly onDidChange: (listener: () => void) => () => void;
};

type Disposing = {
  readonly dispose: () => void;
};

/** A toggle the extension also owns: `dispose` drops its listeners. */
type OwnedToggle = ScriptsToggleApi & Disposing;

/** The two choices the Packages view stores per window: whether it lists package scopes and whether it lists scripts. */
export type Toggles = {
  readonly scripts: OwnedToggle;
  readonly scope: OwnedToggle;
};
