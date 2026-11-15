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

/** Whether the page draws folder links now: none while every folder is expanded. */
export type FolderLinksShown = 'some' | 'none';

/** A folder state the plain-edge checks run in: the folders collapsed from the list, and whether folder links show. */
export type PlainEdgeState = {
  readonly name: string;
  readonly collapsed: string[];
  readonly shown: FolderLinksShown;
};

/** The drawn folder links counted against each oracle; every count but `drawn` is a failure count. */
export type FolderLinkCounts = {
  readonly drawn: number;
  readonly throughNodes: number;
  readonly foreignBoxes: number;
  readonly labelsOnLine: number;
  readonly offBorder: number;
};
