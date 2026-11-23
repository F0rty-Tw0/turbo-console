import type { ModuleRedraw } from './module-mode.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The kinds a modules view with nothing saved shows: every kind but test files. */
export const FRESH_MODULES_SHOWN: ModulesViewState['shown'] = { types: true, tests: false, lazies: true };

/** A module redraw that leaves the camera as it is. */
export const MODULE_REDRAW_KEEP: ModuleRedraw = { kind: 'keep' };

/** The id prefix of a folder, drawn as a box or a card; the root box's id is the prefix alone. */
export const DIR_PREFIX = 'dir:';

/** The id prefix of a file card. */
export const FILE_PREFIX = 'file:';

/** The id prefix of a stub, another workspace package. */
export const STUB_PREFIX = 'pkg:';

/** Past this many drawn leaves the module view warns that drawing can be slow (D10). */
export const MODULE_SHOWN_CAP = 300;

/** The warning shown past `MODULE_SHOWN_CAP` drawn leaves (§7.4). */
export const MODULE_SLOW_TEXT = `Drawing more than ${MODULE_SHOWN_CAP} items can be slow.`;

/** The page root's class while modules mode owns the canvas. */
export const MODULES_MODE_CLASS = 'modules-mode';

/** The modules bar's id; CSS shows it only in modules mode. */
export const MODULES_BAR_ID = 'graph-modules-bar';

/** The Details package button, and the toolbar entry on a single-package root, that open a package's modules. */
export const SHOW_MODULES_LABEL = 'Show modules';

export const MODULES_BACK_LABEL = 'Back';

export const MODULES_REFRESH_LABEL = 'Refresh';

export const MODULES_RETRY_LABEL = 'Retry';

/** The module Controls panel's id, which the toolbar's Controls button points at while modules mode is on. */
export const MODULE_CONTROLS_ID = 'graph-module-controls';

/** The title of the module Controls section that names the focus target. */
export const MODULE_FOCUS_SECTION_TITLE = 'Focus';

/** What the Focus section reads while nothing is focused. */
export const MODULE_NO_FOCUS_TEXT = 'None';

/** The module Details panel's id, which the toolbar's Details button points at while modules mode is on. */
export const MODULE_DETAILS_ID = 'graph-module-details';

/** The heading of a module Details block that lists the lines an end imports with. */
export const MODULE_IMPORTS_HEADING = 'Imports';

/** The heading of a module Details block that lists the lines other files import an end with. */
export const MODULE_IMPORTED_BY_HEADING = 'Imported by';

/** What the module Details panel reads while nothing is selected (spec §6.3). */
export const MODULE_DETAILS_EMPTY_TEXT = 'Select a file, package or link to see its imports.';

/** The module depth hint's id; the package Controls, which stay in the DOM, use `DEPTH_HINT_ID`. */
export const MODULE_DEPTH_HINT_ID = 'graph-module-depth-hint';

export const MODULE_TYPES_LABEL = 'Type-only imports';

export const MODULE_TESTS_LABEL = 'Test files';

export const MODULE_LAZIES_LABEL = 'Dynamic/require';

export const MODULES_RESET_LABEL = 'Reset view';

/** The banner of a scan that found no source file (spec §7.4). */
export const NO_MODULE_FILES_TEXT = 'No source files found.';

/** What the page warns on the console when it drops a `packageModules` its validator rejects (spec §8). */
export const MODULES_DROPPED_WARNING = 'Dropped an invalid packageModules message from the host.';

/** An expanded folder drawn as a compound around its children. */
export const MODULE_BOX_CLASS = 'module-box';

/** A file whose folders are all expanded. */
export const MODULE_FILE_CLASS = 'module-file';

/** A collapsed folder drawn as one card. */
export const MODULE_DIR_CLASS = 'module-dir';

/** Another workspace package a drawn link imports, drawn dashed. */
export const MODULE_STUB_CLASS = 'module-stub';

/** Every module link; solid while it carries a static import. */
export const MODULE_LINK_CLASS = 'module-link';

/** A module link with lazy imports and no static one, drawn dotted. */
export const MODULE_LAZY_CLASS = 'module-lazy';

/** A module link with type imports only, drawn dashed. */
export const MODULE_TYPE_CLASS = 'module-type';

/** The font size of a module link's import count. */
export const MODULE_COUNT_FONT_PX = 10;

/** Below this rendered size the count label is not drawn, so it hides below zoom 0.5 (`min-zoomed-font-size`). */
export const MODULE_COUNT_MIN_ZOOMED_PX = 5;

/** The space between a count and its chip's frame, so two nearby counts never read as one number. */
export const MODULE_COUNT_PADDING_PX = '2px';

/** The width of a count chip's frame. */
export const MODULE_COUNT_BORDER_PX = 1;
