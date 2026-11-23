import type { ModuleControlsElements } from '../../common/module-controls.type.ts';
import type { ModulePanelViews } from '../../common/module-panels.type.ts';
import { buildModuleControls } from '../../ui/module-controls-elements.ts';
import type { ModulePanelViewsMock } from '../common/module-panel-views.type.ts';

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
