import type { GraphWebviewMessage } from '../../../src/bridge/common/graph-message.type.ts';
import type { Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { LayoutDoneMessage, OpenDetailsMessage, PositionsMessage } from '../../common/graph.type.ts';

const isPositions = (message: GraphWebviewMessage): message is PositionsMessage => message.type === 'positions';

const isLayoutDone = (message: GraphWebviewMessage): message is LayoutDoneMessage => message.type === 'layoutDone';

const isOpenDetails = (message: GraphWebviewMessage): message is OpenDetailsMessage => message.type === 'openDetails';

export const positionsPosted = (posted: GraphWebviewMessage[]): PositionsMessage[] => posted.filter(isPositions);

export const layoutDonePosted = (posted: GraphWebviewMessage[]): LayoutDoneMessage[] => posted.filter(isLayoutDone);

export const openDetailsPosted = (posted: GraphWebviewMessage[]): OpenDetailsMessage[] => posted.filter(isOpenDetails);

/** The positions of the last `positions` message, `null` before one is posted. */
export const lastPositionsPosted = (posted: GraphWebviewMessage[]): Positions | null => {
  const messages = positionsPosted(posted);

  return messages.at(-1)?.positions ?? null;
};
