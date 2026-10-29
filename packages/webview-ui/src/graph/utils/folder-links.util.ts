import { collapsedIdOf } from './folder-id.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';

type DrawnEnds = {
  readonly source: string;
  readonly target: string;
};

const endOf = (name: string, folder: string, collapsed: ReadonlySet<string>): string => {
  const isCollapsed = collapsed.has(folder);

  if (!isCollapsed) return name;

  return collapsedIdOf(folder);
};

/** Where an edge is drawn; `null` when an end is unknown, both ends sit in one collapsed folder, or neither end is collapsed. */
const endsOf = (edge: GraphEdge, folderOf: ReadonlyMap<string, string>, collapsed: ReadonlySet<string>): DrawnEnds | null => {
  const sourceFolder = folderOf.get(edge.source);
  const targetFolder = folderOf.get(edge.target);

  if (sourceFolder === undefined || targetFolder === undefined) return null;

  const isCollapsedSource = collapsed.has(sourceFolder);
  const isInside = sourceFolder === targetFolder && isCollapsedSource;

  if (isInside) return null;

  const source = endOf(edge.source, sourceFolder, collapsed);
  const target = endOf(edge.target, targetFolder, collapsed);
  const isUntouched = source === edge.source && target === edge.target;

  if (isUntouched) return null;

  const ends: DrawnEnds = { source, target };

  return ends;
};

/** The visible package links that touch a collapsed folder, merged per drawn (source, target) pair in first-appearance order. */
export const folderLinksOf = (
  edges: GraphEdge[],
  visible: ReadonlySet<string>,
  folderOf: ReadonlyMap<string, string>,
  collapsed: ReadonlySet<string>
): FolderLink[] => {
  const byPair = new Map<string, FolderLink>();

  for (const edge of edges) {
    const isSourceVisible = visible.has(edge.source);
    const isTargetVisible = visible.has(edge.target);
    const isShown = isSourceVisible && isTargetVisible;

    if (!isShown) continue;

    const ends = endsOf(edge, folderOf, collapsed);

    if (ends === null) continue;

    const key = JSON.stringify([ends.source, ends.target]);
    const existing = byPair.get(key);

    if (existing !== undefined) {
      existing.links.push(edge);
      continue;
    }

    const link: FolderLink = { source: ends.source, target: ends.target, links: [edge] };

    byPair.set(key, link);
  }

  const links = byPair.values();

  return [...links];
};

/** The folder link runs from `source` to `target`, matched by its ends, not by reference. */
export const hasEnds = (link: FolderLink, source: string, target: string): boolean => {
  return link.source === source && link.target === target;
};

/** The scene link drawn from `source` to `target`; `null` when there is no scene or no such link. */
export const folderLinkOf = (scene: FolderScene | null, source: string, target: string): FolderLink | null => {
  const links = scene?.links ?? [];
  const isPair = (candidate: FolderLink): boolean => hasEnds(candidate, source, target);
  const link = links.find(isPair);

  return link ?? null;
};
