import { renderWebviewHtml, webviewCsp } from '@turbo-console/webview-ui';

import type { HtmlAssets } from '../../shared/common/html-assets.type.ts';
import type { PanelOptions } from '../common/details-webview.type.ts';

/**
 * Fills the page template. `nonce` is host-made; the other slots are the webview URIs of four fixed file names and
 * `webviewCsp(nonce, cspSource)`, never workspace text.
 */
export const detailsHtml = (template: string, assets: HtmlAssets, nonce: string): string => {
  const csp = webviewCsp(nonce, assets.cspSource);
  const scriptUri = assets.uriOf('main.js');
  const styleUri = assets.uriOf('details.css');
  const codiconUri = assets.uriOf('codicon.css');
  const toolIconsUri = assets.uriOf('tool-icons.css');

  return renderWebviewHtml(template, { csp, nonce, scriptUri, styleUri, codiconUri, toolIconsUri });
};

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
