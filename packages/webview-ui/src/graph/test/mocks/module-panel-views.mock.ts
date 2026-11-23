import type { DetailsElements } from '../../common/details-view.type.ts';
import type { ModuleControlsElements } from '../../common/module-controls.type.ts';
import type { ModuleDetailsElements, ModuleDetailsView, ModuleDetailsViews } from '../../common/module-details.type.ts';
import type { ModulePanelViews } from '../../common/module-panels.type.ts';
import { buildModuleControls } from '../../ui/module-controls-elements.ts';
import { buildModuleDetailsPanel, buildModuleDetailsView } from '../../ui/module-details-elements.ts';
import type { ModuleDetailsViewsMock, ModulePanelViewsMock } from '../common/module-panel-views.type.ts';

/** The real module panel builders, so a spec types, clicks and focuses what the module panels wire. */
export const modulePanelViewsMock = (): ModulePanelViewsMock => {
  const moduleControls: ModuleControlsElements[] = [];
  const controls = (): ModuleControlsElements => {
    const built = buildModuleControls();

    moduleControls.push(built);

    return built;
  };
  const views: ModulePanelViews = { controls };
  const mock: ModulePanelViewsMock = { views, moduleControls };

  return mock;
};

/** The real module Details builders: one panel built now, and each view recorded as it is built. */
export const moduleDetailsViewsMock = (): ModuleDetailsViewsMock => {
  const panel = buildModuleDetailsPanel();
  const built: ModuleDetailsElements[] = [];
  const view = (shown: ModuleDetailsView, isFocused: boolean): ModuleDetailsElements => {
    const elements = buildModuleDetailsView(shown, isFocused);

    built.push(elements);

    return elements;
  };
  const details = (): DetailsElements => panel;
  const views: ModuleDetailsViews = { details, view };
  const mock: ModuleDetailsViewsMock = { views, panel, built };

  return mock;
};
