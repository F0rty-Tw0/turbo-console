import type { Page } from '@playwright/test';

import type { GraphOpenImportMessage } from '../../../src/bridge/common/graph-imports.type.ts';
import type {
  GraphSetViewToggleMessage,
  GraphShownTaskPackagesMessage,
  GraphShownUmbrellasMessage,
  GraphWebviewMessage
} from '../../../src/bridge/common/graph-message.type.ts';
import type { GraphScanModuleSitesMessage } from '../../../src/bridge/common/graph-module-sites.type.ts';
import type { GraphScanModulesMessage } from '../../../src/bridge/common/graph-modules.type.ts';
import type { Positions, Routes } from '../../../src/bridge/common/graph-state.type.ts';
import type {
  ExplainEdgeMessage,
  ExportImageMessage,
  LayoutDoneMessage,
  OpenDetailsMessage,
  OpenManifestMessage,
  PositionsMessage,
  ScanImportsMessage
} from '../../common/graph.type.ts';

const isPositions = (message: GraphWebviewMessage): message is PositionsMessage => message.type === 'positions';

const isLayoutDone = (message: GraphWebviewMessage): message is LayoutDoneMessage => message.type === 'layoutDone';

const isOpenDetails = (message: GraphWebviewMessage): message is OpenDetailsMessage => message.type === 'openDetails';

const isExplainEdge = (message: GraphWebviewMessage): message is ExplainEdgeMessage => message.type === 'explainEdge';

const isScanImports = (message: GraphWebviewMessage): message is ScanImportsMessage => message.type === 'scanImports';

const isScanModules = (message: GraphWebviewMessage): message is GraphScanModulesMessage => message.type === 'scanModules';

const isScanModuleSites = (message: GraphWebviewMessage): message is GraphScanModuleSitesMessage => message.type === 'scanModuleSites';

const isOpenManifest = (message: GraphWebviewMessage): message is OpenManifestMessage => message.type === 'openManifest';

const isOpenImport = (message: GraphWebviewMessage): message is GraphOpenImportMessage => message.type === 'openImport';

const isExportImage = (message: GraphWebviewMessage): message is ExportImageMessage => message.type === 'exportImage';

const isShownUmbrellas = (message: GraphWebviewMessage): message is GraphShownUmbrellasMessage => message.type === 'shownUmbrellas';

const isShownTaskPackages = (message: GraphWebviewMessage): message is GraphShownTaskPackagesMessage =>
  message.type === 'shownTaskPackages';

const isViewToggle = (message: GraphWebviewMessage): message is GraphSetViewToggleMessage => message.type === 'setViewToggle';

export const positionsPosted = (posted: GraphWebviewMessage[]): PositionsMessage[] => posted.filter(isPositions);

export const layoutDonePosted = (posted: GraphWebviewMessage[]): LayoutDoneMessage[] => posted.filter(isLayoutDone);

export const openDetailsPosted = (posted: GraphWebviewMessage[]): OpenDetailsMessage[] => posted.filter(isOpenDetails);

export const explainEdgePosted = (posted: GraphWebviewMessage[]): ExplainEdgeMessage[] => posted.filter(isExplainEdge);

export const scanImportsPosted = (posted: GraphWebviewMessage[]): ScanImportsMessage[] => posted.filter(isScanImports);

/** The `scanModules` messages, oldest first. */
export const scanModulesPosted = (posted: GraphWebviewMessage[]): GraphScanModulesMessage[] => posted.filter(isScanModules);

/** The `scanModuleSites` messages, oldest first. */
export const scanModuleSitesPosted = (posted: GraphWebviewMessage[]): GraphScanModuleSitesMessage[] =>
  posted.filter(isScanModuleSites);

export const openManifestPosted = (posted: GraphWebviewMessage[]): OpenManifestMessage[] => posted.filter(isOpenManifest);

export const openImportPosted = (posted: GraphWebviewMessage[]): GraphOpenImportMessage[] => posted.filter(isOpenImport);

export const exportImagePosted = (posted: GraphWebviewMessage[]): ExportImageMessage[] => posted.filter(isExportImage);

/** The `shownUmbrellas` messages, oldest first. */
export const shownUmbrellasPosted = (posted: GraphWebviewMessage[]): GraphShownUmbrellasMessage[] => posted.filter(isShownUmbrellas);

/** The `shownTaskPackages` messages, oldest first. */
export const shownTaskPackagesPosted = (posted: GraphWebviewMessage[]): GraphShownTaskPackagesMessage[] =>
  posted.filter(isShownTaskPackages);

/** The `setViewToggle` messages, oldest first. */
export const viewTogglesPosted = (posted: GraphWebviewMessage[]): GraphSetViewToggleMessage[] => posted.filter(isViewToggle);

/** The newest `explainEdge` the page posted, `null` before one. */
export const lastExplainPosted = (posted: GraphWebviewMessage[]): ExplainEdgeMessage | null =>
  explainEdgePosted(posted).at(-1) ?? null;

/** The positions of the last `positions` message, `null` before one is posted. */
export const lastPositionsPosted = (posted: GraphWebviewMessage[]): Positions | null => {
  const messages = positionsPosted(posted);

  return messages.at(-1)?.positions ?? null;
};

/** The routes of the last `positions` message, `null` before one is posted. */
export const lastRoutesPosted = (posted: GraphWebviewMessage[]): Routes | null => {
  const messages = positionsPosted(posted);

  return messages.at(-1)?.routes ?? null;
};

/** Every message the page posted to the host stub so far, oldest first. */
export const readPosted = async (page: Page): Promise<GraphWebviewMessage[]> => {
  return page.evaluate((): GraphWebviewMessage[] => window.tcPosted ?? []);
};

/** Runs in the page: the own keys of the last `positions` message, read there, because a `__proto__` key would not survive the trip out. */
export const lastPostedNames = (): string[] => {
  const posted = window.tcPosted ?? [];
  const isPositionsMessage = (message: GraphWebviewMessage): boolean => message.type === 'positions';
  const last = posted.findLast(isPositionsMessage);

  if (last?.type !== 'positions') return [];

  return Object.keys(last.positions);
};

/** Runs in the page: true once any `layoutDone` has been posted. */
export const hasLayoutDone = (): boolean => {
  const posted = window.tcPosted ?? [];

  return posted.some((message: GraphWebviewMessage): boolean => message.type === 'layoutDone');
};

/** Runs in the page: the `performance.now()` at which the page posted `ready`, `null` before it did. */
export const readyPostedAt = (): number | null => {
  const posted = window.tcPosted ?? [];
  const index = posted.findIndex((message: GraphWebviewMessage): boolean => message.type === 'ready');

  if (index === -1) return null;

  return window.tcPostedAt?.[index] ?? null;
};
