import type { Core, EdgeSingular } from 'cytoscape';

import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { DrawnLinks } from '../common/folder-link-route.type.ts';
import type { FolderLink } from '../common/folder-scene.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { drawnBendsOf } from '../utils/drawn-bends.util.ts';
import { folderLinkIdOf } from '../utils/folder-id.util.ts';
import { labelOffsetOf } from '../utils/label-offset.util.ts';

const LABEL_BOX_OPTIONS = { includeLabels: true, includeNodes: false, includeEdges: false, includeOverlays: false };

/** An empty record: the next pass labels every link. */
export const emptyDrawnLinks = (): DrawnLinks => {
  const drawn: DrawnLinks = { keys: new WeakMap(), unlabelled: new Set() };

  return drawn;
};

/**
 * The inputs a link's label is placed from: its count (the label text), where its ends sit, and whether the reverse
 * link is drawn (Cytoscape bows two links between one pair apart). The collapsed nodes follow the members' positions,
 * which move only before a `recentre` or a `relinkFolders`, and each starts an empty record.
 */
const routeKeyOf = (edge: EdgeSingular, link: FolderLink, links: ReadonlyMap<string, FolderLink>): string => {
  const source = edge.source().position();
  const target = edge.target().position();
  const reverseId = folderLinkIdOf(link.target, link.source);
  const hasReverse = links.has(reverseId);
  const parts = [link.links.length, source.x, source.y, target.x, target.y, hasReverse];

  return JSON.stringify(parts);
};

/** A headless Cytoscape has no renderer to measure labels with: it has no container. */
const isHeadlessOf = (cy: Core): boolean => {
  const container = cy.container();

  return container === null;
};

/**
 * Marks a changed link for a new label, and its reverse when drawn: Cytoscape bows two links between one pair apart, so
 * a link that comes or goes moves its reverse's line under that label.
 */
const markUnlabelled = (unlabelled: Set<EdgeSingular>, edge: EdgeSingular, link: FolderLink): void => {
  const reverseId = folderLinkIdOf(link.target, link.source);
  const reverse = edge.cy().getElementById(reverseId);
  const isReverseDrawn = reverse.nonempty();

  unlabelled.add(edge);

  if (isReverseDrawn) unlabelled.add(reverse);
};

/**
 * Records each folder link whose inputs changed since `drawn` recorded it, and marks it and its drawn reverse for
 * `labelFolderLinks` unless Cytoscape is headless. Call it inside the caller's batch, after the collapsed nodes are
 * placed. A link Cytoscape already removed, with the collapsed node `setGrouping` took away before the next `show`, is
 * skipped.
 */
export const markFolderLinks = (cy: Core, links: ReadonlyMap<string, FolderLink>, drawn: DrawnLinks): void => {
  const isHeadless = isHeadlessOf(cy);

  for (const [id, link] of links) {
    const edge = cy.getElementById(id);
    const isGone = edge.empty();

    if (isGone) continue;

    const key = routeKeyOf(edge, link, links);
    const drawnKey = drawn.keys.get(edge);
    const isDrawn = drawnKey === key;

    if (isDrawn) continue;

    drawn.keys.set(edge, key);

    if (isHeadless) continue;

    markUnlabelled(drawn.unlabelled, edge, link);
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
 * Moves the label of each visible folder link marked since its label was placed off its line, by `labelDx`/`labelDy` data
 * the margin rule reads; a hidden one waits for a later pass. Call it after the batch that marked the links: the drawn
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
