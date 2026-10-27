import { PANEL_KEY_STEP_PX, PANEL_MIN_PX } from '../common/graph.const.ts';
import type { PanelSide } from '../common/panel-sash.type.ts';

/** The key that widens each panel: the graph page is LTR, so Controls (left) grows rightwards and Details (right) leftwards. */
const GROW_KEYS: Readonly<Record<PanelSide, string>> = { controls: 'ArrowRight', details: 'ArrowLeft' };

const SHRINK_KEYS: Readonly<Record<PanelSide, string>> = { controls: 'ArrowLeft', details: 'ArrowRight' };

/** The width a key asks of `side`'s panel; `null` when the key is not one the sash handles. */
export const sashKeyWidthOf = (side: PanelSide, key: string, current: number, max: number): number | null => {
  if (key === 'Home') return PANEL_MIN_PX;

  if (key === 'End') return max;

  if (key === GROW_KEYS[side]) return current + PANEL_KEY_STEP_PX;

  if (key === SHRINK_KEYS[side]) return current - PANEL_KEY_STEP_PX;

  return null;
};

/** The width of `side`'s panel with its inner edge under the pointer: Controls from the body's left edge, Details from its right. */
export const sashDragWidthOf = (side: PanelSide, clientX: number, body: Pick<DOMRect, 'left' | 'right'>): number => {
  if (side === 'controls') return Math.round(clientX - body.left);

  return Math.round(body.right - clientX);
};
