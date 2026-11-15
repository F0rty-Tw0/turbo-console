import type { ProbeEdgeLine, ProbeFolderLink } from '../../../src/graph/common/graph-probe.type.ts';
import type { LinkRead } from '../../common/graph-folder-links.type.ts';
import type { ViewportPoint } from '../../common/playwright.type.ts';

const NOWHERE: ViewportPoint = { x: 0, y: 0 };

const lengthOf = (vector: ViewportPoint): number => Math.hypot(vector.x, vector.y);

const minus = (first: ViewportPoint, second: ViewportPoint): ViewportPoint => {
  const difference: ViewportPoint = { x: first.x - second.x, y: first.y - second.y };

  return difference;
};

/** Where the line's end on `id` sits, and where its other, collapsed end sits. */
const endsOf = (link: ProbeFolderLink, line: ProbeEdgeLine, id: string): ViewportPoint[] => {
  const first = line.points.at(0) ?? NOWHERE;
  const last = line.points.at(-1) ?? NOWHERE;
  const fromSource = [first, last];
  const fromTarget = [last, first];

  return link.source === id ? fromSource : fromTarget;
};

/**
 * The drag of the package `id` (in page px) that turns its first drawn folder link to run through where the link's label
 * sits now, keeping its length: a drag that does not place the labels again leaves that label on its line. Of the two
 * turns, toward the label and away from it, the shorter drag; throws when no drawn link ends on `id`.
 */
export const labelTurnDragOf = (read: LinkRead, id: string): ViewportPoint => {
  const endsOnId = (link: ProbeFolderLink): boolean => link.isDrawn && (link.source === id || link.target === id);
  const index = read.links.findIndex(endsOnId);
  const link = read.links[index];
  const line = read.lines[index];

  if (link === undefined || line === undefined) throw new Error(`graph e2e: no drawn folder link ends on ${id}`);

  const [packageEnd = NOWHERE, collapsedEnd = NOWHERE] = endsOf(link, line, id);
  const { labelBox } = link;
  const labelCentre: ViewportPoint = { x: labelBox.left + labelBox.width / 2, y: labelBox.top + labelBox.height / 2 };
  const offset = minus(labelCentre, line.midpoint);
  const scale = lengthOf(minus(packageEnd, collapsedEnd)) / lengthOf(offset);
  const dragTo = (sign: number): ViewportPoint => {
    const target: ViewportPoint = { x: collapsedEnd.x + sign * scale * offset.x, y: collapsedEnd.y + sign * scale * offset.y };

    return minus(target, packageEnd);
  };
  const toward = dragTo(1);
  const away = dragTo(-1);

  return lengthOf(toward) <= lengthOf(away) ? toward : away;
};
