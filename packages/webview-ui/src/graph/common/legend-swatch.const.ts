import { EDGE_WIDTH, NODE_BORDER_PX } from './graph.const.ts';
import type { LegendSwatch } from './legend.type.ts';

/** The package box every box row spreads: the frame, 6 px corners, the editor background. */
export const BOX_SWATCH: LegendSwatch = {
  shape: 'box',
  stroke: 'frame',
  strokePx: NODE_BORDER_PX,
  dashPx: null,
  radiusPx: 6,
  fill: 'background',
  outline: null,
  isArrow: false,
  isBold: false,
  isDimmed: false,
  isNested: false,
  hasPlate: false
};

/** A file node: a box with corners half its 20 px height. */
export const PILL_SWATCH: LegendSwatch = { ...BOX_SWATCH, shape: 'pill', radiusPx: 10 };

/** A plain edge; each line row spreads it. */
export const LINE_SWATCH: LegendSwatch = {
  ...BOX_SWATCH,
  shape: 'line',
  stroke: 'edge',
  strokePx: EDGE_WIDTH,
  radiusPx: 0,
  fill: null
};
