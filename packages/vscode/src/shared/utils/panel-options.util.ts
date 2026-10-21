import type { PanelOptions } from '../common/panel-options.type.ts';

/** Scripts on, forms off, the page folder as the only resource root, no command URIs; the page is rebuilt on show. */
export const panelOptionsOf = <TRoot>(assetRoot: TRoot): PanelOptions<TRoot> => {
  const options: PanelOptions<TRoot> = {
    enableScripts: true,
    enableForms: false,
    localResourceRoots: [assetRoot],
    retainContextWhenHidden: false
  };

  return options;
};
