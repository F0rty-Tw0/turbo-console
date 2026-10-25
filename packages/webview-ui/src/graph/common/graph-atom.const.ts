/** The class of a task node that is an Atomizer umbrella; it keeps `task` and adds this one. */
export const ATOM_UMBRELLA_CLASS = 'atom-umbrella';

/** The height one counts line adds under an umbrella's name. */
export const ATOM_COUNTS_LINE_PX = 16;

/** The longest counts line an `atoms` state may carry, in characters. */
export const ATOM_COUNTS_TEXT_MAX = 200;

/** The id prefix of an expanded group's box: `atom:<umbrellaId>`. */
export const ATOM_BOX_PREFIX = 'atom:';

/** The size of a file node in an expanded group. */
export const ATOM_FILE_SIZE = { width: 96, height: 20 } as const;

/** The gap between file nodes, and between the umbrella and the first file row. */
export const ATOM_GRID_GAP_PX = 8;

/** The space between an expanded group's box frame and what it holds. */
export const ATOM_BOX_PADDING_PX = 12;
