/* eslint-disable no-underscore-dangle -- the page and its init scripts expose these exact names on window */

import type { Page } from '@playwright/test';

import type { GraphShownUmbrellasMessage, GraphWebviewMessage } from '../../../src/bridge/common/graph-message.type.ts';
import type { Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type {
  ExplainEdgeMessage,
  ExportImageMessage,
  LayoutDoneMessage,
  OpenDetailsMessage,
  OpenManifestMessage,
  PositionsMessage
} from '../../common/graph.type.ts';

const isPositions = (message: GraphWebviewMessage): message is PositionsMessage => message.type === 'positions';

const isLayoutDone = (message: GraphWebviewMessage): message is LayoutDoneMessage => message.type === 'layoutDone';

const isOpenDetails = (message: GraphWebviewMessage): message is OpenDetailsMessage => message.type === 'openDetails';

const isExplainEdge = (message: GraphWebviewMessage): message is ExplainEdgeMessage => message.type === 'explainEdge';

const isOpenManifest = (message: GraphWebviewMessage): message is OpenManifestMessage => message.type === 'openManifest';

const isExportImage = (message: GraphWebviewMessage): message is ExportImageMessage => message.type === 'exportImage';

const isShownUmbrellas = (message: GraphWebviewMessage): message is GraphShownUmbrellasMessage => message.type === 'shownUmbrellas';

export const positionsPosted = (posted: GraphWebviewMessage[]): PositionsMessage[] => posted.filter(isPositions);

export const layoutDonePosted = (posted: GraphWebviewMessage[]): LayoutDoneMessage[] => posted.filter(isLayoutDone);

export const openDetailsPosted = (posted: GraphWebviewMessage[]): OpenDetailsMessage[] => posted.filter(isOpenDetails);

export const explainEdgePosted = (posted: GraphWebviewMessage[]): ExplainEdgeMessage[] => posted.filter(isExplainEdge);

export const openManifestPosted = (posted: GraphWebviewMessage[]): OpenManifestMessage[] => posted.filter(isOpenManifest);

export const exportImagePosted = (posted: GraphWebviewMessage[]): ExportImageMessage[] => posted.filter(isExportImage);

/** The `shownUmbrellas` messages, oldest first. */
export const shownUmbrellasPosted = (posted: GraphWebviewMessage[]): GraphShownUmbrellasMessage[] => posted.filter(isShownUmbrellas);

/** The newest `explainEdge` the page posted, `null` before one. */
export const lastExplainPosted = (posted: GraphWebviewMessage[]): ExplainEdgeMessage | null =>
  explainEdgePosted(posted).at(-1) ?? null;

/** The positions of the last `positions` message, `null` before one is posted. */
export const lastPositionsPosted = (posted: GraphWebviewMessage[]): Positions | null => {
  const messages = positionsPosted(posted);

  return messages.at(-1)?.positions ?? null;
};

/** Every message the page posted to the host stub so far, oldest first. */
export const readPosted = async (page: Page): Promise<GraphWebviewMessage[]> => {
  return page.evaluate((): GraphWebviewMessage[] => window.__posted ?? []);
};

/** Runs in the page: the own keys of the last `positions` message, read there, because a `__proto__` key would not survive the trip out. */
export const lastPostedNames = (): string[] => {
  const posted = window.__posted ?? [];
  const isPositionsMessage = (message: GraphWebviewMessage): boolean => message.type === 'positions';
  const last = posted.findLast(isPositionsMessage);

  if (last?.type !== 'positions') return [];

  return Object.keys(last.positions);
};

/** Runs in the page: true once any `layoutDone` has been posted. */
export const hasLayoutDone = (): boolean => {
  const posted = window.__posted ?? [];

  return posted.some((message: GraphWebviewMessage): boolean => message.type === 'layoutDone');
};
