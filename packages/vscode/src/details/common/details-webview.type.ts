/**
 * What the page template needs of a webview: its `cspSource`, and `uriOf`, the webview URI of a file in the page
 * folder (`webview.asWebviewUri(Uri.joinPath(extensionUri, 'dist/webview/details', name)).toString()`).
 */
export type HtmlAssets = {
  readonly cspSource: string;
  readonly uriOf: (name: string) => string;
};

/** `WebviewPanelOptions` and `WebviewOptions` of a panel, over the URI type of the editor (`vscode.Uri`). */
export type PanelOptions<Root> = {
  readonly enableScripts: true;
  readonly enableForms: false;
  readonly localResourceRoots: Root[];
  readonly retainContextWhenHidden: false;
};
