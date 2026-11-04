import type { BoundingBox12, Core, EdgeSingular, NodeSingular } from 'cytoscape';

import { setClassesAmong } from './graph-classes.ts';
import type { EdgeRoute, Position, Routes } from '../../bridge/common/graph-state.type.ts';
import type { CollapsedEnd } from '../common/folder-link-route.type.ts';
import type { FolderLink } from '../common/folder-scene.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import { COLLAPSED_ID_PREFIX, FOLDER_LINK_CLASS, FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';
import { drawnBendsOf } from '../utils/drawn-bends.util.ts';
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

const LABEL_ONLY = { includeLabels: true, includeNodes: false, includeEdges: false, includeOverlays: false };

const boxOfNode = (node: NodeSingular): BoundingBox12 => {
  const { x, y } = node.position();
  const halfWidth: number = node.data('width') / 2;
  const halfHeight: number = node.data('height') / 2;
  const box: BoundingBox12 = { x1: x - halfWidth, y1: y - halfHeight, x2: x + halfWidth, y2: y + halfHeight };

  return box;
};

/** The members' boxes joined and grown by the folder padding: the box ELK laid the folder out in, read from the packages because a hidden box has no bounds. */
const folderBoxOf = (cy: Core, names: string[]): BoundingBox12 => {
  const boxes = names.map((name): BoundingBox12 => boxOfNode(cy.getElementById(name)));
  const lefts = boxes.map((member) => member.x1);
  const tops = boxes.map((member) => member.y1);
  const rights = boxes.map((member) => member.x2);
  const bottoms = boxes.map((member) => member.y2);
  const box: BoundingBox12 = {
    x1: Math.min(...lefts) - FOLDER_PADDING_PX,
    y1: Math.min(...tops) - FOLDER_PADDING_PX,
    x2: Math.max(...rights) + FOLDER_PADDING_PX,
    y2: Math.max(...bottoms) + FOLDER_PADDING_PX
  };

  return box;
};

const collapsedEndOf = (scene: DrawnScene, id: string): CollapsedEnd | null => {
  const isCollapsed = id.startsWith(COLLAPSED_ID_PREFIX);

  if (!isCollapsed) return null;

  const names = scene.members.get(id.slice(COLLAPSED_ID_PREFIX.length)) ?? [];
  const centre = scene.cy.getElementById(id).position();
  const box = folderBoxOf(scene.cy, names);
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

/**
 * Draws each folder link on its first member's bends outside the collapsed boxes, or straight when none is left. Call it
 * inside the caller's batch, after the collapsed nodes are placed and `members` holds the scene being drawn.
 */
export const routeFolderLinks = (
  cy: Core,
  links: ReadonlyMap<string, FolderLink>,
  members: ReadonlyMap<string, string[]>,
  routes: Routes
): void => {
  const scene: DrawnScene = { cy, members, routes };

  for (const [id, link] of links) routeLink(scene, cy.getElementById(id), link);
};

const offsetOf = (edge: EdgeSingular): Position => {
  const bends = drawnBendsOf(edge);
  const path = [edge.sourceEndpoint(), ...bends, edge.targetEndpoint()];
  const { w, h } = edge.boundingBox(LABEL_ONLY);
  const size: NodeSize = { width: w, height: h };

  return labelOffsetOf(path, edge.midpoint(), size);
};

/**
 * Moves each visible folder link's label off its line, by `labelDx`/`labelDy` data the margin rule reads. Call it after the
 * batch that routed the links: the drawn path exists only once Cytoscape has applied it. A headless Cytoscape has no
 * renderer to measure with (it has no container), so there it does nothing.
 */
export const labelFolderLinks = (cy: Core): void => {
  const container = cy.container();
  const isHeadless = container === null;

  if (isHeadless) return;

  const edges = cy.edges(`.${FOLDER_LINK_CLASS}`).filter((edge): boolean => edge.visible());
  const place = (edge: EdgeSingular): void => {
    const { x, y } = offsetOf(edge);

    edge.data({ labelDx: x, labelDy: y });
  };

  cy.batch((): void => void edges.forEach(place));
};
