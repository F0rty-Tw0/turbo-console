/** Past this many drawn leaves the module view warns that drawing can be slow (D10). */
export const MODULE_SHOWN_CAP = 300;

/** The warning shown past `MODULE_SHOWN_CAP` drawn leaves (§7.4). */
export const MODULE_SLOW_TEXT = `Drawing more than ${MODULE_SHOWN_CAP} items can be slow.`;

/** The page root's class while modules mode owns the canvas. */
export const MODULES_MODE_CLASS = 'modules-mode';

/** What the page warns on the console when it drops a `packageModules` its validator rejects (spec §8). */
export const MODULES_DROPPED_WARNING = 'Dropped an invalid packageModules message from the host.';
