import type { BoundingBox12 } from 'cytoscape';

import { edgeIdOf } from './edge-id.util.ts';
import type { EdgeRoute, Position } from '../../bridge/common/graph-state.type.ts';
import type { CollapsedEnd } from '../common/folder-link-route.type.ts';
import type { FolderLink } from '../common/folder-scene.type.ts';

const isInside = (point: Position, box: BoundingBox12): boolean => {
  const insideX = point.x >= box.x1 && point.x <= box.x2;
  const insideY = point.y >= box.y1 && point.y <= box.y2;

  return insideX && insideY;
};

/** The least edge id among the merged package links of a folder link: the member whose route the folder link follows. */
export const firstMemberIdOf = (link: FolderLink): string => {
  const ids = link.links.map(edgeIdOf);
  const sorted = ids.toSorted((a, b) => a.localeCompare(b));
  const first = sorted[0] ?? '';

  return first;
};

/** The member's bends outside every collapsed box, from the collapsed centres; `null` when it has no member or no bend is kept. */
export const folderLinkRouteOf = (
  member: EdgeRoute | undefined,
  source: CollapsedEnd | null,
  target: CollapsedEnd | null
): EdgeRoute | null => {
  if (!member) return null;

  const candidates = [source, target];
  const ends = candidates.filter((end) => end !== null);
  const isKept = (bend: Position): boolean => ends.every((end) => !isInside(bend, end.box));
  const bends = member.bends.filter(isKept);

  if (bends.length === 0) return null;

  const route: EdgeRoute = { start: source?.centre ?? member.start, bends, end: target?.centre ?? member.end };

  return route;
};
