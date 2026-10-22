import type { ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';

import type { GraphEdge, GraphPackage, Position, Positions } from '../../../bridge/common/graph-state.type.ts';
import type { FolderScene } from '../../common/folder-scene.type.ts';
import type { DrawnGraph } from '../../common/graph-page.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';
import { groupedElkGraphOf } from '../../utils/elk-grouped-graph.util.ts';
import { folderSceneOf } from '../../utils/folder-scene.util.ts';
import type { ElkRect, SceneParts } from '../common/folder-boards.type.ts';
import { BOARDS_EDGES_STUB, BOARDS_GROUPS_STUB, BOARDS_SIZE_STUB } from '../stubs/folder-boards.stub.ts';

/** The boards fixture's packages in the order docs, web, @acme/config, @acme/ui, @acme/utils. */
export const BOARDS_INFOS: GraphPackage[] = BOARDS_GROUPS_STUB.flatMap((group) => group.packages);

export const BOARDS_EDGES: GraphEdge[] = BOARDS_EDGES_STUB;

export const BOARDS_NAMES: string[] = BOARDS_INFOS.map((pkg) => pkg.name);

/** The boards fixture as the page's drawn graph. */
export const BOARDS_DRAWN: DrawnGraph = { hash: 'boards', packages: BOARDS_NAMES, infos: BOARDS_INFOS, edges: BOARDS_EDGES };

/** The boards fixture as a folder scene; `visible` defaults to every package. */
export const boardsSceneOf = (collapsed: string[], visible?: string[], ghosts: string[] = []): FolderScene => {
  return folderSceneOf(BOARDS_INFOS, BOARDS_EDGES, new Set(collapsed), new Set(visible ?? BOARDS_NAMES), new Set(ghosts));
};

const infoOf = (name: string, path: string): GraphPackage => {
  const info: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return info;
};

/** Three folders: `a` and `c` in `f1`, `b` in `f2`, `d` in `f3`. */
export const THREE: GraphPackage[] = [infoOf('a', 'f1/a'), infoOf('b', 'f2/b'), infoOf('c', 'f1/c'), infoOf('d', 'f3/d')];

export const THREE_EDGES: GraphEdge[] = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
  { source: 'b', target: 'd' }
];

/** A folder scene over any fixture; `visible` defaults to every package, `collapsed` and `ghosts` to none. */
export const sceneOf = (infos: GraphPackage[], edges: GraphEdge[], parts: SceneParts): FolderScene => {
  const names = infos.map((info) => info.name);
  const collapsed = new Set(parts.collapsed ?? []);
  const visible = new Set(parts.visible ?? names);
  const ghosts = new Set(parts.ghosts ?? []);

  return folderSceneOf(infos, edges, collapsed, visible, ghosts);
};

export const boardsSizeOf = (): NodeSize => BOARDS_SIZE_STUB;

/** The grouped ELK input of the boards fixture. */
export const boardsGraphOf = (): ElkNode => groupedElkGraphOf(BOARDS_GROUPS_STUB, BOARDS_EDGES_STUB, boardsSizeOf);

export const childrenOf = (node: ElkNode): ElkNode[] => node.children ?? [];

export const idsOf = (nodes: ElkNode[]): string[] => nodes.map((node) => node.id);

/** The boards fixture laid out by the real, bundled ELK. */
export const layoutBoards = async (): Promise<ElkNode> => {
  const elk = new elkConstructor();

  return elk.layout(boardsGraphOf());
};

const numberOf = (value: number | undefined): number => value ?? 0;

export const rectOf = (node: ElkNode): ElkRect => {
  const left = numberOf(node.x);
  const top = numberOf(node.y);
  const rect: ElkRect = { left, top, right: left + numberOf(node.width), bottom: top + numberOf(node.height) };

  return rect;
};

const overlapsOn = (startA: number, endA: number, startB: number, endB: number): boolean => startA < endB && startB < endA;

const overlap = (first: ElkRect, second: ElkRect): boolean => {
  const isAcross = overlapsOn(first.left, first.right, second.left, second.right);
  const isDown = overlapsOn(first.top, first.bottom, second.top, second.bottom);

  return isAcross && isDown;
};

const overlapsAnyAfter = (rect: ElkRect, index: number, rects: ElkRect[]): boolean => {
  const others = rects.slice(index + 1);

  return others.some((other) => overlap(rect, other));
};

/** Any two of `rects` overlap. */
export const hasOverlap = (rects: ElkRect[]): boolean => rects.some(overlapsAnyAfter);

const strictlyBetween = (value: number, low: number, high: number): boolean => low < value && value < high;

const isInside = (centre: Position, rect: ElkRect): boolean =>
  strictlyBetween(centre.x, rect.left, rect.right) && strictlyBetween(centre.y, rect.top, rect.bottom);

/** Left, top, right and bottom room between `child` and its `compound`'s edges. */
const roomsOf = (compound: ElkNode, child: ElkNode): number[] => {
  const { left, top, right, bottom } = rectOf(child);
  const outer = rectOf(compound);

  return [left, top, outer.right - outer.left - right, outer.bottom - outer.top - bottom];
};

/** Every room between a compound's edges and each of its children, four per child. */
export const allRoomsOf = (laidOut: ElkNode): number[] => {
  const roomsInCompound = (compound: ElkNode): number[] => {
    const children = childrenOf(compound);

    return children.flatMap((child) => roomsOf(compound, child));
  };

  return childrenOf(laidOut).flatMap(roomsInCompound);
};

/** The children whose centre in `centres` is missing or outside their compound. */
export const outsidersOf = (laidOut: ElkNode, centres: Positions): string[] => {
  const outsidersInCompound = (compound: ElkNode): string[] => {
    const rect = rectOf(compound);
    const isOutside = (child: ElkNode): boolean => {
      const centre = centres[child.id];

      if (centre === undefined) return true;

      return !isInside(centre, rect);
    };
    const children = childrenOf(compound);
    const outsiders = children.filter(isOutside);

    return outsiders.map((child) => child.id);
  };

  return childrenOf(laidOut).flatMap(outsidersInCompound);
};
