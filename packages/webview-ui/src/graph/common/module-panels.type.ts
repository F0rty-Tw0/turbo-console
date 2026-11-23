import type { ModuleControlsElements } from './module-controls.type.ts';
import type { ModuleDetailsViews } from './module-details.type.ts';

type ModuleControlsViews = { readonly controls: () => ModuleControlsElements };

/** The module panel builders, handed in because `domain-logic` may not import `ui`. */
export type ModulePanelViews = ModuleControlsViews & ModuleDetailsViews;

/**
 * What modules mode tells its panels: it was entered from package or task mode, a package's scan started or failed, or it
 * was left.
 */
export type ModulePanelHooks = {
  readonly enter: () => void;
  readonly scanning: (name: string) => void;
  readonly failed: () => void;
  readonly exit: () => void;
};
