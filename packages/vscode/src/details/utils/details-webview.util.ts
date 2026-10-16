import { randomBytes } from 'node:crypto';

import { renderWebviewHtml, webviewCsp } from '@turbo-console/webview-ui';

import type { HtmlAssets, PanelOptions } from '../common/details-webview.type.ts';

const NONCE_BYTES = 16;

/** A new nonce for one html assignment. */
export const freshNonce = (): string => randomBytes(NONCE_BYTES).toString('base64');

/**
 * Fills the page template. `nonce` is host-made; the other slots are the webview URIs of three fixed file names and
 * `webviewCsp(nonce, cspSource)`, never workspace text.
 */
export const detailsHtml = (template: string, assets: HtmlAssets, nonce: string): string => {
  const csp = webviewCsp(nonce, assets.cspSource);
  const scriptUri = assets.uriOf('main.js');
  const styleUri = assets.uriOf('details.css');
  const codiconUri = assets.uriOf('codicon.css');

  return renderWebviewHtml(template, { csp, nonce, scriptUri, styleUri, codiconUri });
};

/** Scripts on, forms off, the page folder as the only resource root, no command URIs; the page is rebuilt on show. */
export const panelOptionsOf = <Root>(assetRoot: Root): PanelOptions<Root> => {
  const options: PanelOptions<Root> = {
    enableScripts: true,
    enableForms: false,
    localResourceRoots: [assetRoot],
    retainContextWhenHidden: false
  };

  return options;
};
