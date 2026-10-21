import type { Roots } from './coordinator.type.ts';

/** What a panel registry's wiring reads of `RootsSession`: the root store and a panel's visibility report. */
export type PanelRoots = {
  readonly store: Roots;
  readonly setPanelVisible: (root: string, panelId: string, visible: boolean) => void;
};
