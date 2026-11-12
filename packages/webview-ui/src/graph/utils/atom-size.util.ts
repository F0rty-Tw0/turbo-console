import {
  ATOM_CHIP_BORDER_PX,
  ATOM_CHIP_GAP_PX,
  ATOM_CHIP_GLYPH_GAP_PX,
  ATOM_CHIP_GLYPH_PX,
  ATOM_CHIP_PAD_PX,
  ATOM_COUNTS_LINE_PX
} from '../common/graph-atom.const.ts';
import type { TextMeasure, UmbrellaSizers } from '../common/graph-page.type.ts';
import { NODE_PADDING_X } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

/** A chip's border, both sides. */
const CHIP_BORDER_PX = 2 * ATOM_CHIP_BORDER_PX;

/** The glyph slot of a chip: the glyph and its gap to the text. */
const CHIP_GLYPH_SLOT_PX = ATOM_CHIP_GLYPH_PX + ATOM_CHIP_GLYPH_GAP_PX;

/** The chips every group can show, each worded at the file count: the worst case of its width. */
const chipTextsOf = (fileCount: number): string[] => [`${fileCount} files`, `${fileCount} cached`, `${fileCount} failed`];

/**
 * The width of the widest chip row a group of `fileCount` files can show: the three chips, a glyph slot on the cached
 * and failed chips when `glyphs`, the gaps between chips and the side inset of a node.
 */
export const chipRowWidthOf = (measure: TextMeasure, fileCount: number, glyphs: boolean): number => {
  const chipWidthOf = (text: string): number => measure(text) + 2 * ATOM_CHIP_PAD_PX + CHIP_BORDER_PX;
  const chipTexts = chipTextsOf(fileCount);
  const chipsWidth = chipTexts.reduce((sum, text): number => sum + chipWidthOf(text), 0);
  const glyphSlots = 2 * CHIP_GLYPH_SLOT_PX;
  const glyphsWidth = glyphs ? glyphSlots : 0;
  const gapsWidth = 2 * ATOM_CHIP_GAP_PX;

  return chipsWidth + glyphsWidth + gapsWidth + NODE_PADDING_X;
};

/** An umbrella's node: wide enough for its name or its widest chip row, one counts line taller than its name. */
export const umbrellaSizeOf = (sizers: UmbrellaSizers, name: string, fileCount: number): NodeSize => {
  const nameSize = sizers.name(name);
  const rowWidth = chipRowWidthOf(sizers.chips, fileCount, sizers.glyphs);
  const size: NodeSize = { width: Math.max(nameSize.width, rowWidth), height: nameSize.height + ATOM_COUNTS_LINE_PX };

  return size;
};
