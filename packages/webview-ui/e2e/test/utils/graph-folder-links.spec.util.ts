/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import { isInside, pointBoxOf } from './element-rect.spec.util.ts';
import { boxRectOf } from './graph-folders.spec.util.ts';
import { foreignBoxHitsOf } from './graph-foreign-boxes.spec.util.ts';
import { lineSegmentsOf } from './graph-geometry.spec.util.ts';
import { crossesBox, shrunkBy, throughNodeCountOf } from './graph-lines.spec.util.ts';
import type { ProbeEdgeLine, ProbeFolder, ProbeFolderLink } from '../../../src/graph/common/graph-probe.type.ts';
import { edgeIdOf } from '../../../src/graph/utils/edge-id.util.ts';
import type { CollapsedEnd, FolderLinkCounts, LinkAndLine, LinkRead, RoutedLink } from '../../common/graph-folder-links.type.ts';
import type { LinkEnds } from '../../common/playwright.type.ts';

/** How far inside a node's box a link must reach to count as passing through it, in page px. */
const THROUGH_INSET_PX = 2;

/** The 8 px rounded corners put a node's border about 2.3 px inside its box: an end is on the border only outside the box shrunk by this much times the zoom. */
const BORDER_INSIDE_PX = 3;

/** The arrowhead and the 1 px border sit within this much times the zoom of the box. */
const BORDER_OUTSIDE_PX = 8;

/** Runs in the page through `evaluate`, so it reads only `window`: one read of the links, their lines, the folders and the nodes. */
export const readLinks = (): LinkRead => {
  const probe = window.__tcGraphProbe;

  if (probe === undefined) {
    const none: LinkRead = { links: [], lines: [], folders: [], nodes: [], zoom: 0 };

    return none;
  }

  const read: LinkRead = {
    links: probe.folderLinks(),
    lines: probe.folderLinkLines(),
    folders: probe.folders(),
    nodes: probe.nodes(),
    zoom: probe.zoom()
  };

  return read;
};

const isDrawnRouted = (line: ProbeEdgeLine): boolean => line.isDrawn && line.isRouted;

const isLabelDrawn = (link: ProbeFolderLink): boolean => link.isDrawn && link.labelBox.width > 0 && link.labelBox.height > 0;

/** At least one link, each drawn with a label that has a size and with a line of its own, so no oracle passes for lack of input. */
export const isReady = (read: LinkRead): boolean => {
  const hasLines = read.links.length === read.lines.length;

  return read.links.length > 0 && hasLines && read.links.every(isLabelDrawn);
};

const pairsOf = (read: LinkRead): LinkAndLine[] => {
  const pairs: LinkAndLine[] = [];
  const addPair = (link: ProbeFolderLink, index: number): void => {
    const line = read.lines[index];

    if (line !== undefined) pairs.push({ link, line });
  };

  read.links.forEach(addPair);

  return pairs;
};

const isLabelOnLine = ({ link, line }: LinkAndLine): boolean => {
  const meetsLabel = (segment: LinkEnds): boolean => crossesBox(segment, link.labelBox);

  return lineSegmentsOf(line).some(meetsLabel);
};

const collapsedEndsOf = ({ link, line }: LinkAndLine, folders: ProbeFolder[]): CollapsedEnd[] => {
  const first = line.points.at(0);
  const last = line.points.at(-1);
  const endsOf = (folder: ProbeFolder): CollapsedEnd[] => {
    const box = boxRectOf(folder);
    const ends: CollapsedEnd[] = [];

    if (first !== undefined && link.source === folder.folder) ends.push({ point: first, box });

    if (last !== undefined && link.target === folder.folder) ends.push({ point: last, box });

    return ends;
  };
  const isCollapsedNode = (folder: ProbeFolder): boolean => folder.isCollapsed && folder.isVisible;
  const collapsed = folders.filter(isCollapsedNode);

  return collapsed.flatMap(endsOf);
};

const isOffBorder = ({ point, box }: CollapsedEnd, zoom: number): boolean => {
  const inner = shrunkBy(box, BORDER_INSIDE_PX * zoom);
  const outer = shrunkBy(box, -BORDER_OUTSIDE_PX * zoom);
  const spot = pointBoxOf(point);

  return isInside(spot, inner) || !isInside(spot, outer);
};

/** The collapsed ends off the border ring; a link with no collapsed end found counts once, so a key mismatch cannot pass. */
const offBorderCountOf = (read: LinkRead): number => {
  const faultsOf = (pair: LinkAndLine): number => {
    const ends = collapsedEndsOf(pair, read.folders);
    const isOff = (end: CollapsedEnd): boolean => isOffBorder(end, read.zoom);
    const offEnds = ends.filter(isOff);
    const faults = ends.length === 0 ? 1 : offEnds.length;

    return faults;
  };
  const addCount = (sum: number, count: number): number => sum + count;

  return pairsOf(read).map(faultsOf).reduce(addCount, 0);
};

export const countsOf = (read: LinkRead): FolderLinkCounts => {
  const pairs = pairsOf(read);
  const drawn = read.links.filter((link): boolean => link.isDrawn);
  const counts: FolderLinkCounts = {
    drawn: drawn.length,
    routed: read.lines.filter(isDrawnRouted).length,
    throughNodes: throughNodeCountOf(read.lines, read.nodes, read.zoom, THROUGH_INSET_PX),
    foreignBoxes: foreignBoxHitsOf(read.lines, read.folders, read.zoom),
    labelsOnLine: pairs.filter(isLabelOnLine).length,
    offBorder: offBorderCountOf(read)
  };

  return counts;
};

const routedLinkOf = (line: ProbeEdgeLine): RoutedLink => {
  const link: RoutedLink = { id: edgeIdOf(line), source: line.source, target: line.target };

  return link;
};

const idOf = (link: RoutedLink): string => link.id;

const byId = (first: RoutedLink, second: RoutedLink): number => first.id.localeCompare(second.id);

/** The drawn folder links that run on a route, by id order. */
export const routedLinksOf = (read: LinkRead): RoutedLink[] => {
  const routed = read.lines.filter(isDrawnRouted);
  const links = routed.map(routedLinkOf);

  return links.toSorted(byId);
};

/** The first routed link's end that is a package node, by name order; throws when no routed link ends on a package. */
export const routedPackageEndOf = (read: LinkRead): string => {
  const names = new Set(read.nodes.map((node): string => node.id));
  const ends = routedLinksOf(read).flatMap((link): string[] => [link.source, link.target]);
  const isPackage = (id: string): boolean => names.has(id);
  const end = ends.toSorted().find(isPackage);

  if (end === undefined) throw new Error('graph e2e: no routed folder link ends on a package');

  return end;
};

/** The ids of the links of `before` that do not end on `dragged`. */
export const idsNotEndingOn = (before: RoutedLink[], dragged: string): string[] => {
  const isKept = (link: RoutedLink): boolean => link.source !== dragged && link.target !== dragged;

  return before.filter(isKept).map(idOf);
};
