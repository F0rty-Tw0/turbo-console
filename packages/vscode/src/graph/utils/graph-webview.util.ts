import { graphCsp, renderWebviewHtml } from '@turbo-console/webview-ui';

import type { HtmlAssets } from '../../shared/common/html-assets.type.ts';
import { GRAPH_TITLE_PREFIX } from '../common/graph.const.ts';

/**
 * Fills the graph page template. `nonce` is host-made; the other slots are `graphCsp(nonce, cspSource)` and the
 * webview URIs of two fixed file names, never workspace text. A slot the template lacks is ignored.
 */
export const graphHtml = (template: string, assets: HtmlAssets, nonce: string): string => {
  const csp = graphCsp(nonce, assets.cspSource);
  const scriptUri = assets.uriOf('main.js');
  const styleUri = assets.uriOf('graph.css');

  return renderWebviewHtml(template, { csp, nonce, scriptUri, styleUri });
};

export const graphTitleOf = (folderName: string): string => `${GRAPH_TITLE_PREFIX}${folderName}`;
