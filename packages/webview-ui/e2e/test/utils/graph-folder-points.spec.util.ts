import { boxGrabOf, boxRectOf } from './graph-folders.spec.util.ts';
import type { Position, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { ProbeFolder, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { BoxDragRecord } from '../../common/graph-folders.type.ts';
import type { ViewportPoint } from '../../common/playwright.type.ts';

/** How far in from a box's top left corner a tap lands: inside its 32 px padding, clear of every package. */
const CORNER_INSET_PX = 6;

/** How far a moved package may sit from where the drag should have put it, in model units. */
const MOVE_TOLERANCE = 1;

const centreOfFolder = (folder: ProbeFolder): ViewportPoint => {
  const centre: ViewportPoint = { x: folder.renderedX, y: folder.renderedY };

  return centre;
};

const centreOfNode = (node: ProbeNode): ViewportPoint => {
  const centre: ViewportPoint = { x: node.renderedX, y: node.renderedY };

  return centre;
};

/** The point of a box that no package covers: its top left corner, 6 px in. */
export const boxCornerOf = (folder: ProbeFolder): ViewportPoint => {
  const rect = boxRectOf(folder);
  const corner: ViewportPoint = { x: rect.left + CORNER_INSET_PX, y: rect.top + CORNER_INSET_PX };

  return corner;
};

/** A folder's tap point: the centre of its collapsed node, or the middle of its box's left padding band, level with its centre. */
export const folderPadTapOf = (folder: ProbeFolder, zoom: number): ViewportPoint => {
  if (folder.isCollapsed) return centreOfFolder(folder);

  return boxGrabOf(folder, zoom);
};

/** A folder's tap point: the centre of its collapsed node, or the corner of its box. */
export const folderTapOf = (folder: ProbeFolder): ViewportPoint => {
  if (folder.isCollapsed) return centreOfFolder(folder);

  return boxCornerOf(folder);
};

/** A link end's rendered centre: a collapsed folder's node when `end` names one, else the package. */
export const endCentreOf = (end: string, folders: ProbeFolder[], nodes: ProbeNode[]): ViewportPoint => {
  const collapsed = folders.find((folder): boolean => folder.folder === end && folder.isCollapsed);
  const node = nodes.find((candidate): boolean => candidate.id === end);

  if (collapsed !== undefined) return centreOfFolder(collapsed);

  if (node !== undefined) return centreOfNode(node);

  throw new Error(`graph e2e: no collapsed folder or package '${end}' is drawn`);
};

/** `source + t * (target - source)`. */
export const linkPointOf = (source: ViewportPoint, target: ViewportPoint, t: number): ViewportPoint => {
  const point: ViewportPoint = { x: source.x + t * (target.x - source.x), y: source.y + t * (target.y - source.y) };

  return point;
};

/** The centre of the bounding box of the packages' rendered centres. */
export const hullCentreOf = (nodes: ProbeNode[]): ViewportPoint => {
  const xs = nodes.map((node): number => node.renderedX);
  const ys = nodes.map((node): number => node.renderedY);
  const centre: ViewportPoint = {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2
  };

  return centre;
};

/** The largest gap on either axis between two points. */
export const gapBetween = (first: ViewportPoint, second: ViewportPoint): number =>
  Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y));

const movedFaultOf = (name: string, now: Positions, drag: BoxDragRecord, isMoving: boolean): string[] => {
  const from: Position | undefined = drag.before[name];
  const to: Position | undefined = now[name];

  if (from === undefined || to === undefined) return [`${name} is missing`];

  const moved: Position = { x: from.x + drag.dx / drag.zoom, y: from.y + drag.dy / drag.zoom };
  const expected = isMoving ? moved : from;
  const gap = Math.max(Math.abs(to.x - expected.x), Math.abs(to.y - expected.y));

  if (gap <= MOVE_TOLERANCE) return [];

  return [`${name} is ${gap.toFixed(1)} model units from where it should be`];
};

/** Each of `names` that is not where the drag leaves it: moved once by the drag, or, for `isMoving` false, where it was. */
export const moveFaultsOf = (names: string[], now: Positions, drag: BoxDragRecord, isMoving: boolean): string[] => {
  const faultsOf = (name: string): string[] => movedFaultOf(name, now, drag, isMoving);

  return names.flatMap(faultsOf);
};
