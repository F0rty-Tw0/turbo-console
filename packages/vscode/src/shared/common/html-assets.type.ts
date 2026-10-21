/**
 * What a page template needs of a webview: its `cspSource`, and `uriOf`, the webview URI of a file in the page
 * folder (`webview.asWebviewUri(Uri.joinPath(assetRoot, name)).toString()`).
 */
export type HtmlAssets = {
  readonly cspSource: string;
  readonly uriOf: (name: string) => string;
};

/** Builds a page's html from its `index.html` template, the webview assets and a fresh nonce. */
export type HtmlBuilder = (template: string, assets: HtmlAssets, nonce: string) => string;
