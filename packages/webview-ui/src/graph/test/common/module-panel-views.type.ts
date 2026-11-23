import type { DetailsElements } from '../../common/details-view.type.ts';
import type { ModuleControlsElements } from '../../common/module-controls.type.ts';
import type { ModuleDetailsElements, ModuleDetailsViews } from '../../common/module-details.type.ts';
import type { ModulePanelViews } from '../../common/module-panels.type.ts';

/** The real module panel builders, each panel they build recorded, the latest last. */
export type ModulePanelViewsMock = {
  readonly views: ModulePanelViews;
  readonly moduleControls: ModuleControlsElements[];
};

/** The real module Details builders over one panel built up front; each view they build is recorded, the latest last. */
export type ModuleDetailsViewsMock = {
  readonly views: ModuleDetailsViews;
  readonly panel: DetailsElements;
  readonly built: ModuleDetailsElements[];
};
