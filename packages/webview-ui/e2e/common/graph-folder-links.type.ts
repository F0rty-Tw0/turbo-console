import type { ElementRect, ViewportPoint } from './playwright.type.ts';
import type { ProbeEdgeLine, ProbeFolder, ProbeFolderLink, ProbeNode } from '../../src/graph/common/graph-probe.type.ts';

/** One probe read of the folder links, their lines, the folders they end on and the nodes they must clear. */
export type LinkRead = {
  readonly links: ProbeFolderLink[];
  readonly lines: ProbeEdgeLine[];
  readonly folders: ProbeFolder[];
  readonly nodes: ProbeNode[];
  readonly zoom: number;
};

/** A link and its line, which the probe lists in the same order. */
export type LinkAndLine = {
  readonly link: ProbeFolderLink;
  readonly line: ProbeEdgeLine;
};

/** Where a link's line ends on a collapsed folder, and that folder's box. */
export type LinkEndOnFolder = {
  readonly point: ViewportPoint;
  readonly box: ElementRect;
};

/** The drawn folder links counted against each oracle; every count but `drawn` and `routed` is a failure count. */
export type FolderLinkCounts = {
  readonly drawn: number;
  readonly routed: number;
  readonly throughNodes: number;
  readonly foreignBoxes: number;
  readonly labelsOnLine: number;
  readonly offBorder: number;
};

/** A drawn folder link on a route, by its id and its two node ids. */
export type RoutedLink = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
};
