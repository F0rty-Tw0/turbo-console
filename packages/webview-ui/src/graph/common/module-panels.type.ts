import type { ModuleControlsElements } from './module-controls.type.ts';

/** The module panel builders, handed in because `domain-logic` may not import `ui`. */
export type ModulePanelViews = {
  readonly controls: () => ModuleControlsElements;
};

/** What modules mode tells its panels: it was entered from package or task mode, a package's scan started, or it was left. */
export type ModulePanelHooks = {
  readonly enter: () => void;
  readonly scanning: (name: string) => void;
  readonly exit: () => void;
};
