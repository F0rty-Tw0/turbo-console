/** `WebviewPanelOptions` and `WebviewOptions` of a panel, over the URI type of the editor (`vscode.Uri`). */
export type PanelOptions<TRoot> = {
  readonly enableScripts: true;
  readonly enableForms: false;
  readonly localResourceRoots: TRoot[];
  readonly retainContextWhenHidden: false;
};
