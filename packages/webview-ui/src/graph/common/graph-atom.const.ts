import { NODE_FONT_SIZE } from './graph.const.ts';
import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';

/** The class of a task node that is an Atomizer umbrella; it keeps `task` and adds this one. */
export const ATOM_UMBRELLA_CLASS = 'atom-umbrella';

/** The height one counts line adds under an umbrella's name. */
export const ATOM_COUNTS_LINE_PX = 16;

/** The height of one count chip: the counts line an umbrella has under its name. */
export const ATOM_CHIP_HEIGHT_PX = ATOM_COUNTS_LINE_PX;

/** The font size of a count chip: two px under a node label. */
export const ATOM_CHIP_FONT_PX = NODE_FONT_SIZE - 2;

/** The inset on each side of a count chip's text, inside its border. */
export const ATOM_CHIP_PAD_PX = 6;

/** The gap between count chips in a row. */
export const ATOM_CHIP_GAP_PX = 4;

/** The border on each side of a count chip, in every theme. */
export const ATOM_CHIP_BORDER_PX = 1;

/** The gap between a chip glyph and the chip's text. */
export const ATOM_CHIP_GLYPH_GAP_PX = 3;

/** The width of a chip glyph (cached or failed): the glyph itself. */
export const ATOM_CHIP_GLYPH_PX = 12;

/** The class of an expanded group's box. */
export const ATOM_BOX_CLASS = 'atom-box';

/** The class of an Atomizer file node; it is never a `task`. */
export const ATOM_FILE_CLASS = 'atom-file';

/** The class of the count node that stands for the files an expanded group does not draw; it is never a `task`. */
export const ATOM_MORE_CLASS = 'atom-more';

/** The class of a file node whose test is a live one; its border is dashed. */
export const ATOM_LIVE_CLASS = 'atom-live';

/** The class of a file node for each outcome that outlines it; a file with no outcome has none. */
export const ATOM_OUTCOME_CLASSES: Readonly<Record<Exclude<GraphAtomOutcome, 'none'>, string>> = {
  passed: 'atom-passed',
  failed: 'atom-failed',
  cached: 'atom-cached'
};

/** The id prefix of an expanded group's box: `atom:<umbrellaId>`. */
export const ATOM_BOX_PREFIX = 'atom:';

/** The id prefix of a capped group's count node: `atom-more:<umbrellaId>`. */
export const ATOM_MORE_PREFIX = 'atom-more:';

/** The most files an expanded group draws before its count node; a group of one more draws them all. */
export const ATOM_FILE_CAP = 10;

/** The size of a file node in an expanded group. */
export const ATOM_FILE_SIZE = { width: 96, height: 20 } as const;

/** The gap between file nodes, and between the umbrella and the first file row. */
export const ATOM_GRID_GAP_PX = 8;

/** The space between an expanded group's box frame and what it holds. */
export const ATOM_BOX_PADDING_PX = 12;
