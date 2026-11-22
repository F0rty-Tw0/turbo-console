/** Past this many drawn leaves the module view warns that drawing can be slow (D10). */
export const MODULE_SHOWN_CAP = 300;

/** The warning shown past `MODULE_SHOWN_CAP` drawn leaves (§7.4). */
export const MODULE_SLOW_TEXT = `Drawing more than ${MODULE_SHOWN_CAP} items can be slow.`;

/** The page root's class while modules mode owns the canvas. */
export const MODULES_MODE_CLASS = 'modules-mode';

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
