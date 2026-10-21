export const GRAPH_VIEW_TYPE = 'turboConsole.packageGraph';

/** The folder of the built graph page under the extension, the only `localResourceRoots` entry of a panel. */
export const GRAPH_ASSET_DIR: string[] = ['dist', 'webview', 'graph'];

export const GRAPH_COMMAND = 'turboConsole.openPackageGraph';

export const GRAPH_CACHE_KEY_PREFIX = 'turboConsole.graphLayout:';

export const NO_ROOT_TEXT = 'Turbo Console: no Turborepo workspace found';

export const GRAPH_TITLE_PREFIX = 'Package Graph — ';

/** A panel id for `RootsSession.setPanelVisible`: no absolute root path starts with it, so it never collides with a Details id. */
export const GRAPH_PANEL_ID_PREFIX = 'graph\0';
