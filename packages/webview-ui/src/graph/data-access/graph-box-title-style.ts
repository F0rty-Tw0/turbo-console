import type { NodeSingular } from 'cytoscape';

import { FOLDER_PADDING_PX, NODE_FONT_SIZE } from '../common/graph.const.ts';

/** Moves a `top` label down from above the frame to the middle of the box's top padding band. */
const TITLE_MARGIN_Y = (FOLDER_PADDING_PX + NODE_FONT_SIZE) / 2;

/** A task box's `data(minWidth)`, its title width; 0 for a box without one. */
const minWidthOf = (box: NodeSingular): number => {
  const value: unknown = box.data('minWidth');

  return typeof value === 'number' ? value : 0;
};

/**
 * A task box's `minWidth`, the title width its `min-width` never lets the box go under, so the title draws whole; a box
 * without one (a folder box while exporting) takes its width without its padding, so its title ends a padding short of
 * each side of the frame. Only that box reads `box.width()`: on a compound it recomputes the children's bounds, which
 * every style apply of every task box paid on a large open.
 */
const titleWidthOf = (box: NodeSingular): string => {
  const minWidth = minWidthOf(box);

  if (minWidth > 0) return `${minWidth}px`;

  const width = box.width();

  return `${width}px`;
};

/**
 * A box's title centred in the top padding band, inside the frame, cut with an ellipsis when wider than the box. A folder
 * box draws it only while `exportPngOf` runs, since the page shows its DOM header row instead; `taskRulesOf` left-aligns
 * it for a task box. `cy.png` bounds skip the title, so outside the frame it would be cut off at the image edge.
 */
export const BOX_TITLE = {
  label: 'data(title)',
  'text-valign': 'top',
  'text-halign': 'center',
  'text-margin-y': TITLE_MARGIN_Y,
  'text-wrap': 'ellipsis',
  'text-max-width': titleWidthOf
} as const;
