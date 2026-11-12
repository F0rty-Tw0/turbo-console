import type { Position } from '../../bridge/common/graph-state.type.ts';
import { ATOM_CHIP_HEIGHT_PX, ATOM_COUNTS_LINE_PX } from '../common/graph-atom.const.ts';

/**
 * The CSS transform of an umbrella's chip row (spec D3): its model top-left is the node's left edge, and half a counts
 * line under the centre less half a chip, mapped to the screen as `pan + model * zoom`.
 */
export const chipRowTransformOf = (centre: Position, width: number, pan: Position, zoom: number): string => {
  const x = centre.x - width / 2;
  const y = centre.y + ATOM_COUNTS_LINE_PX / 2 - ATOM_CHIP_HEIGHT_PX / 2;
  const screenX = pan.x + x * zoom;
  const screenY = pan.y + y * zoom;

  return `translate(${String(screenX)}px, ${String(screenY)}px) scale(${String(zoom)})`;
};
