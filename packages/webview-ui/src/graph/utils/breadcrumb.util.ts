import { folderTitleOf } from './controls-text.util.ts';
import { byCodeUnit, folderOf } from './folder-group.util.ts';
import { pluralOf } from './plural.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import { BREADCRUMB_MAX_LINES } from '../common/graph.const.ts';

type FolderLinkCount = {
  readonly title: string;
  readonly count: number;
};

const folderMapOf = (infos: GraphPackage[]): Map<string, string> => {
  const folders = new Map<string, string>();

  for (const pkg of infos) folders.set(pkg.name, folderOf(pkg.path));

  return folders;
};

const countsOf = (focused: string, infos: GraphPackage[], edges: GraphEdge[]): Map<string, number> => {
  const folders = folderMapOf(infos);
  const counts = new Map<string, number>();

  for (const edge of edges) {
    const source = folders.get(edge.source);
    const target = folders.get(edge.target);
    const isKnown = source !== undefined && target !== undefined;
    const isCrossing = (source === focused) !== (target === focused);

    if (!isKnown || !isCrossing) continue;

    const other = source === focused ? target : source;

    counts.set(other, (counts.get(other) ?? 0) + 1);
  }

  return counts;
};

const byCountThenTitle = (left: FolderLinkCount, right: FolderLinkCount): number => {
  if (left.count !== right.count) return right.count - left.count;

  return byCodeUnit(left.title, right.title);
};

const rowOf = ([folder, count]: [string, number]): FolderLinkCount => {
  const row: FolderLinkCount = { title: folderTitleOf(folder), count };

  return row;
};

const lineOf = (row: FolderLinkCount): string => `${pluralOf(row.count, 'link', 'links')} with ${row.title} not shown`;

/** One line per other folder linked with `focused` in either direction, whatever the links' visibility: count descending, then title by code unit; the first lines, then `and <k> more folder(s)`. */
export const breadcrumbLinesOf = (focused: string, infos: GraphPackage[], edges: GraphEdge[]): string[] => {
  const counts = countsOf(focused, infos, edges);
  const entries = [...counts];
  const rows = entries.map(rowOf);

  rows.sort(byCountThenTitle);

  const shown = rows.slice(0, BREADCRUMB_MAX_LINES);
  const lines = shown.map(lineOf);
  const hiddenCount = rows.length - BREADCRUMB_MAX_LINES;

  const rest = pluralOf(hiddenCount, 'more folder', 'more folders');

  if (hiddenCount > 0) lines.push(`and ${rest}`);

  return lines;
};
