import type { BoundingBox12, Core, EdgeSingular, NodeSingular } from 'cytoscape';

import { setClassesAmong } from './graph-classes.ts';
import type { EdgeRoute, Position, Routes } from '../../bridge/common/graph-state.type.ts';
import type { CollapsedEnd, DrawnLinks, FolderRouting } from '../common/folder-link-route.type.ts';
import type { FolderLink } from '../common/folder-scene.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import { COLLAPSED_ID_PREFIX, FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';
import { drawnBendsOf } from '../utils/drawn-bends.util.ts';
import { unionBoxOf } from '../utils/folder-box.util.ts';
import { folderLinkIdOf } from '../utils/folder-id.util.ts';
import { firstMemberIdOf, folderLinkRouteOf } from '../utils/folder-link-route.util.ts';
import { labelOffsetOf } from '../utils/label-offset.util.ts';
import { routeSegmentsOf } from '../utils/route-segments.util.ts';

/** Cytoscape clips the line at the node border for this endpoint; a px offset is drawn as given, which would put the arrow under the node. */
const COLLAPSED_ENDPOINT = 'outside-to-node';

type DrawnScene = {
  readonly cy: Core;
  readonly members: ReadonlyMap<string, string[]>;
  readonly routes: Routes;
};

const ROUTED_CLASSES: string[] = [ROUTED_CLASS];

const NO_CLASSES: string[] = [];

const LABEL_BOX_OPTIONS = { includeLabels: true, includeNodes: false, includeEdges: false, includeOverlays: false };

const boxOfNode = (node: NodeSingular): BoundingBox12 => {
  const { x, y } = node.position();
  const halfWidth: number = node.data('width') / 2;
  const halfHeight: number = node.data('height') / 2;
  const box: BoundingBox12 = { x1: x - halfWidth, y1: y - halfHeight, x2: x + halfWidth, y2: y + halfHeight };

  return box;
};

/** The members' boxes joined and grown by the folder padding: the box ELK laid the folder out in, read from the packages because a hidden box has no bounds. `null` for no members. */
const folderBoxOf = (cy: Core, names: string[]): BoundingBox12 | null => {
  const boxes = names.map((name): BoundingBox12 => boxOfNode(cy.getElementById(name)));
  const union = unionBoxOf(boxes);

  if (union === null) return null;

  const box: BoundingBox12 = {
    x1: union.x1 - FOLDER_PADDING_PX,
    y1: union.y1 - FOLDER_PADDING_PX,
    x2: union.x2 + FOLDER_PADDING_PX,
    y2: union.y2 + FOLDER_PADDING_PX
  };

  return box;
};

/** A link end on a collapsed folder; `null` for a package end, and for a folder the members do not list, which has no box to leave. */
const collapsedEndOf = (scene: DrawnScene, id: string): CollapsedEnd | null => {
  const isCollapsed = id.startsWith(COLLAPSED_ID_PREFIX);

  if (!isCollapsed) return null;

  const names = scene.members.get(id.slice(COLLAPSED_ID_PREFIX.length)) ?? [];
  const box = folderBoxOf(scene.cy, names);

  if (box === null) return null;

  const centre = scene.cy.getElementById(id).position();
  const end: CollapsedEnd = { centre, box };

  return end;
};

const segmentsOf = (edge: EdgeSingular, route: EdgeRoute | null): RouteSegments | null => {
  if (route === null) return null;

  return routeSegmentsOf(route, edge.source().position(), edge.target().position());
};

const routeLink = (scene: DrawnScene, edge: EdgeSingular, link: FolderLink): void => {
  const source = collapsedEndOf(scene, link.source);
  const target = collapsedEndOf(scene, link.target);
  const route = folderLinkRouteOf(scene.routes[firstMemberIdOf(link)], source, target);
  const segments = segmentsOf(edge, route);

  if (segments === null) {
    setClassesAmong(edge, ROUTED_CLASSES, NO_CLASSES);

    return;
  }

  const srcEnd = source ? COLLAPSED_ENDPOINT : segments.srcEnd;
  const tgtEnd = target ? COLLAPSED_ENDPOINT : segments.tgtEnd;
  const data = { ...segments, srcEnd, tgtEnd };

  edge.data(data);
  setClassesAmong(edge, ROUTED_CLASSES, ROUTED_CLASSES);
};

/** An empty record: the next pass routes and labels every link. */
export const emptyDrawnLinks = (): DrawnLinks => {
  const drawn: DrawnLinks = { keys: new WeakMap(), unlabelled: new Set() };

  return drawn;
};

/**
 * The inputs a link's route and label are built from: its first member, its count (the label text), where its ends sit,
 * and whether the reverse link is drawn (Cytoscape bows two straight links between one pair apart). The collapsed boxes
 * follow the members' positions, which move only before a `recentre` or a `setRoutes`, and each starts an empty record.
 */
const routeKeyOf = (edge: EdgeSingular, link: FolderLink, links: ReadonlyMap<string, FolderLink>): string => {
  const source = edge.source().position();
  const target = edge.target().position();
  const reverseId = folderLinkIdOf(link.target, link.source);
  const hasReverse = links.has(reverseId);
  const parts = [firstMemberIdOf(link), link.links.length, source.x, source.y, target.x, target.y, hasReverse];

  return JSON.stringify(parts);
};

/** A headless Cytoscape has no renderer to measure labels with: it has no container. */
const isHeadlessOf = (cy: Core): boolean => {
  const container = cy.container();

  return container === null;
};

/**
 * Draws each folder link whose inputs changed since `drawn` recorded it on its first member's bends outside the collapsed
 * boxes, or straight when none is left, and marks it for `labelFolderLinks` unless Cytoscape is headless. Call it inside
 * the caller's batch, after the collapsed nodes are placed and `routing.members` holds the scene being drawn. A link
 * Cytoscape already removed, with the collapsed node `setGrouping` took away before the next `show`, is skipped.
 */
export const routeFolderLinks = (cy: Core, links: ReadonlyMap<string, FolderLink>, routing: FolderRouting): void => {
  const { members, routes, drawn } = routing;
  const scene: DrawnScene = { cy, members, routes };
  const isHeadless = isHeadlessOf(cy);

  for (const [id, link] of links) {
    const edge = cy.getElementById(id);
    const isGone = edge.empty();

    if (isGone) continue;

    const key = routeKeyOf(edge, link, links);
    const drawnKey = drawn.keys.get(edge);
    const isDrawn = drawnKey === key;

    if (isDrawn) continue;

    routeLink(scene, edge, link);
    drawn.keys.set(edge, key);

    if (isHeadless) continue;

    drawn.unlabelled.add(edge);
  }
};

const offsetOf = (edge: EdgeSingular): Position => {
  const bends = drawnBendsOf(edge);
  const path = [edge.sourceEndpoint(), ...bends, edge.targetEndpoint()];
  const { w, h } = edge.boundingBox(LABEL_BOX_OPTIONS);
  const size: NodeSize = { width: w, height: h };

  return labelOffsetOf(path, edge.midpoint(), size);
};

const isRemoved = (edge: EdgeSingular): boolean => edge.removed();

const isPlaceable = (edge: EdgeSingular): boolean => {
  const isGone = isRemoved(edge);

  return !isGone && edge.visible();
};

/**
 * Moves the label of each visible folder link routed since its label was placed off its line, by `labelDx`/`labelDy` data
 * the margin rule reads; a hidden one waits for a later pass. Call it after the batch that routed the links: the drawn
 * path exists only once Cytoscape has applied it. On a headless Cytoscape it does nothing.
 */
export const labelFolderLinks = (cy: Core, drawn: DrawnLinks): void => {
  const isHeadless = isHeadlessOf(cy);

  if (isHeadless) return;

  const pending = [...drawn.unlabelled];
  const edges = pending.filter(isPlaceable);
  const removed = pending.filter(isRemoved);
  const settled = [...edges, ...removed];
  const place = (edge: EdgeSingular): void => {
    const { x, y } = offsetOf(edge);

    edge.data({ labelDx: x, labelDy: y });
  };

  cy.batch((): void => void edges.forEach(place));

  for (const edge of settled) drawn.unlabelled.delete(edge);
};
