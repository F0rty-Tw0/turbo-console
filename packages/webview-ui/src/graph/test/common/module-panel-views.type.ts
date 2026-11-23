import type { ModuleControlsElements } from '../../common/module-controls.type.ts';
import type { ModulePanelViews } from '../../common/module-panels.type.ts';

/** The real module panel builders, each panel they build recorded, the latest last. */
export type ModulePanelViewsMock = {
  readonly views: ModulePanelViews;
  readonly moduleControls: ModuleControlsElements[];
};
