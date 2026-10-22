import { drawableEdges } from './closure.util.ts';
import { folderOf } from './folder-group.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';

type EndOf = (edge: GraphEdge) => string;

const sourceOf: EndOf = (edge) => edge.source;

const targetOf: EndOf = (edge) => edge.target;

const nameOf = (pkg: GraphPackage): string => pkg.name;

const neighboursOf = (edges: GraphEdge[], startOf: EndOf, endOf: EndOf): Map<string, string[]> => {
  const neighbours = new Map<string, string[]>();

  for (const edge of edges) {
    const start = startOf(edge);
    const ends = neighbours.get(start) ?? [];

    ends.push(endOf(edge));
    neighbours.set(start, ends);
  }

  return neighbours;
};

const withinDepth = (start: string, depth: number, neighbours: Map<string, string[]>): Set<string> => {
  const reached = new Set([start]);
  let frontier = [start];

  for (let level = 0; level < depth; level++) {
    const next: string[] = [];

    for (const name of frontier) {
      const ends = neighbours.get(name) ?? [];
      const unseen = ends.filter((end) => !reached.has(end));

      for (const end of unseen) reached.add(end);

      next.push(...unseen);
    }

    frontier = next;
  }

  return reached;
};

const packageFocusOf = (names: Set<string>, focus: GraphFocus | null): string | null => {
  if (focus?.kind !== 'package') return null;

  const isKnown = names.has(focus.name);

  return isKnown ? focus.name : null;
};

const folderFocusOf = (packages: GraphPackage[], focus: GraphFocus | null): string | null => {
  if (focus?.kind !== 'folder') return null;

  const { folder } = focus;
  const isKnown = packages.some((pkg) => folderOf(pkg.path) === folder);

  return isKnown ? folder : null;
};

const focusSetOf = (names: Set<string>, edges: GraphEdge[], focused: string | null, depth: number): Set<string> => {
  if (focused === null) return names;

  const drawn = drawableEdges([...names], edges);
  const dependencyWalk = neighboursOf(drawn, sourceOf, targetOf);
  const dependentWalk = neighboursOf(drawn, targetOf, sourceOf);
  const dependencies = withinDepth(focused, depth, dependencyWalk);
  const dependents = withinDepth(focused, depth, dependentWalk);
  const inFocus = new Set([...dependencies, ...dependents]);

  return inFocus;
};

const hasAnyTag = (pkg: GraphPackage, tags: ReadonlySet<string>): boolean => {
  if (tags.size === 0) return true;

  return pkg.tags.some((tag) => tags.has(tag));
};

/**
 * The package names the graph shows, narrowed by tags and unchecked names: a package focus keeps its neighbourhood (within
 * `filters.depth`) and itself; a folder focus keeps the packages of that folder and ignores the depth. An unknown focus narrows nothing.
 */
export const visibleOf = (packages: GraphPackage[], edges: GraphEdge[], filters: GraphFilters): Set<string> => {
  const names = new Set(packages.map(nameOf));
  const focusedName = packageFocusOf(names, filters.focus);
  const focusedFolder = folderFocusOf(packages, filters.focus);
  const inFocus = focusSetOf(names, edges, focusedName, filters.depth);
  const visible = new Set<string>();

  for (const pkg of packages) {
    const isInFocus = inFocus.has(pkg.name);
    const isInFolder = focusedFolder === null || folderOf(pkg.path) === focusedFolder;
    const isOutside = !isInFocus || !isInFolder;
    const isTagged = hasAnyTag(pkg, filters.tags);
    const isHidden = filters.hidden.has(pkg.name);

    if (isOutside || !isTagged || isHidden) continue;

    visible.add(pkg.name);
  }

  if (focusedName !== null) visible.add(focusedName);

  return visible;
};
