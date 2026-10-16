/** The part of `vscode.Memento` the scripts toggle uses. */
export type ToggleStore = {
  readonly get: (key: string) => unknown;
  readonly update: (key: string, value: boolean) => Thenable<void>;
};

/**
 * What `ScriptsToggle` needs from the editor: the `workspaceState` it stores the choice in, `setKey` mirroring it to the
 * context key the title-bar commands read, and `log` taking a finished line (`logTextOf`).
 */
export type ScriptsTogglePorts = {
  readonly store: ToggleStore;
  readonly setKey: (value: boolean) => Thenable<void>;
  readonly log: (line: string) => void;
};

/** The scripts toggle as the tree and the commands see it; `onDidChange` returns its unsubscribe. */
export type ScriptsToggleApi = {
  readonly isShown: () => boolean;
  readonly set: (value: boolean) => Promise<void>;
  readonly onDidChange: (listener: () => void) => () => void;
};
