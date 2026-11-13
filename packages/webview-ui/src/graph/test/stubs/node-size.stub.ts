import type { NodeSize } from '../../common/node-size.type.ts';

/** The size the layout specs give every node. */
export const NODE_SIZE_STUB: NodeSize = { width: 80, height: 32 };

/** The size the layout specs give every plain task card, distinct from `NODE_SIZE_STUB`. */
export const CARD_SIZE_STUB: NodeSize = { width: 180, height: 60 };
