/** Past this many drawn leaves the module view warns that drawing can be slow (D10). */
export const MODULE_SHOWN_CAP = 300;

/** The warning shown past `MODULE_SHOWN_CAP` drawn leaves (§7.4). */
export const MODULE_SLOW_TEXT = `Drawing more than ${MODULE_SHOWN_CAP} items can be slow.`;
