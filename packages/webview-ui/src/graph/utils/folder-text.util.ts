import { folderTitleOf } from './controls-text.util.ts';
import { folderOfElementId } from './folder-id.util.ts';
import { pluralOf } from './plural.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { FolderCounts } from '../common/details.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';

/** Each package link once, however often `edges` repeats it. */
const distinctOf = (edges: GraphEdge[]): GraphEdge[] => {
  const byEnds = new Map<string, GraphEdge>();

  for (const edge of edges) {
    const key = JSON.stringify([edge.source, edge.target]);

    byEnds.set(key, edge);
  }

  const distinct = byEnds.values();

  return Array.from(distinct);
};

/** Hidden members count in `packages` and `inside`; a link in or out counts only while both its ends are visible (filter sense). */
export const folderCountsOf = (scene: FolderScene, folder: string): FolderCounts => {
  const names = new Set(scene.members.get(folder));
  const edges = distinctOf(scene.edges);
  const isShown = (edge: GraphEdge): boolean => scene.visible.has(edge.source) && scene.visible.has(edge.target);
  const isInside = (edge: GraphEdge): boolean => names.has(edge.source) && names.has(edge.target);
  const isIn = (edge: GraphEdge): boolean => !names.has(edge.source) && names.has(edge.target) && isShown(edge);
  const isOut = (edge: GraphEdge): boolean => names.has(edge.source) && !names.has(edge.target) && isShown(edge);
  const inside = edges.filter(isInside).length;
  const linksIn = edges.filter(isIn).length;
  const linksOut = edges.filter(isOut).length;
  const counts: FolderCounts = { packages: names.size, inside, linksIn, linksOut };

  return counts;
};

const linksText = (count: number, where: string): string => {
  const links = pluralOf(count, 'link', 'links');

  return `${links} ${where}`;
};

/** The toolbar status line of a folder inspection; a `0` in or out part is left out. */
export const folderStatusText = (title: string, scene: FolderScene, folder: string): string => {
  const counts = folderCountsOf(scene, folder);
  const packages = pluralOf(counts.packages, 'package', 'packages');
  const parts = [packages];

  if (counts.linksIn > 0) parts.push(linksText(counts.linksIn, 'in'));

  if (counts.linksOut > 0) parts.push(linksText(counts.linksOut, 'out'));

  const facts = parts.join(', ');

  return `Folder ${title}: ${facts}`;
};

export const folderSummaryOf = (counts: FolderCounts): string => {
  const packages = pluralOf(counts.packages, 'package', 'packages');
  const inside = linksText(counts.inside, 'inside');

  return `${packages} · ${inside}`;
};

export const folderPackagesTitleOf = (count: number): string => `Packages (${count})`;

/** A bundle end as the reader sees it: a package name, or the title of a collapsed folder. */
export const bundleEndTextOf = (id: string): string => {
  const folder = folderOfElementId(id);

  if (folder === null) return id;

  return folderTitleOf(folder);
};

/** The canvas label, the count line and the summary of a folder link: how many package links it bundles. */
export const folderLinkCountTextOf = (link: FolderLink): string => pluralOf(link.links.length, 'link', 'links');

/** The Details bar and status line of a bundle; the count is the canvas label's. */
export const bundleSummaryOf = (link: FolderLink): string => {
  const links = folderLinkCountTextOf(link);
  const source = bundleEndTextOf(link.source);
  const target = bundleEndTextOf(link.target);

  return `${links}: ${source} → ${target}`;
};
