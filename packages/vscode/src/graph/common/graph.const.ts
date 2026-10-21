export const GRAPH_VIEW_TYPE = 'turboConsole.packageGraph';

/** The folder of the built graph page under the extension, the only `localResourceRoots` entry of a panel. */
export const GRAPH_ASSET_DIR: string[] = ['dist', 'webview', 'graph'];

export const GRAPH_COMMAND = 'turboConsole.openPackageGraph';

export const GRAPH_CACHE_KEY_PREFIX = 'turboConsole.graphLayout:';

export const NO_ROOT_TEXT = 'Turbo Console: no Turborepo workspace found';

export const GRAPH_OPEN_FAILED_TEXT = 'Could not open the Package Graph. See Output.';

export const GRAPH_TITLE_PREFIX = 'Package Graph — ';

/** A panel id for `RootsSession.setPanelVisible`: no absolute root path starts with it, so it never collides with a Details id. */
export const GRAPH_PANEL_ID_PREFIX = 'graph\0';

/** A graph hash as `graphHashOf` makes it: eight lower-case hex digits. */
export const GRAPH_HASH_PATTERN = /^[0-9a-f]{8}$/;

/** npm's limit on a package name's length; no workspace package has a longer one. */
export const PACKAGE_NAME_MAX = 214;

/** A `positions` message with more keys than this is dropped before its values are checked. */
export const POSITIONS_MAX = 5000;

/** A stored or posted coordinate past this magnitude is not a layout. */
export const COORDINATE_MAX = 1e7;
