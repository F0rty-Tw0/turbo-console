import type { ScriptsToggleApi } from './scripts-toggle.type.ts';

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
