import { drawableEdges } from './closure.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFilters, GraphFocus } from '../common/graph-filters.type.ts';

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

const knownFocusOf = (names: Set<string>, focus: GraphFocus | null): GraphFocus | null => {
  if (focus === null) return null;

  const isKnown = names.has(focus.name);

  if (!isKnown) return null;

  return focus;
};

const focusSetOf = (names: Set<string>, edges: GraphEdge[], focus: GraphFocus | null): Set<string> => {
  if (focus === null) return names;

  const drawn = drawableEdges([...names], edges);
  const dependencyWalk = neighboursOf(drawn, sourceOf, targetOf);
  const dependentWalk = neighboursOf(drawn, targetOf, sourceOf);
  const dependencies = withinDepth(focus.name, focus.depth, dependencyWalk);
  const dependents = withinDepth(focus.name, focus.depth, dependentWalk);
  const inFocus = new Set([...dependencies, ...dependents]);

  return inFocus;
};

const hasAnyTag = (pkg: GraphPackage, tags: ReadonlySet<string>): boolean => {
  if (tags.size === 0) return true;

  return pkg.tags.some((tag) => tags.has(tag));
};

/** The package names the graph shows: the focus neighbourhood, narrowed by tags and unchecked names; the focus itself always stays. */
export const visibleOf = (packages: GraphPackage[], edges: GraphEdge[], filters: GraphFilters): Set<string> => {
  const names = new Set(packages.map(nameOf));
  const focus = knownFocusOf(names, filters.focus);
  const inFocus = focusSetOf(names, edges, focus);
  const visible = new Set<string>();

  for (const pkg of packages) {
    const isInFocus = inFocus.has(pkg.name);
    const isTagged = hasAnyTag(pkg, filters.tags);
    const isHidden = filters.hidden.has(pkg.name);

    if (!isInFocus || !isTagged || isHidden) continue;

    visible.add(pkg.name);
  }

  if (focus !== null) visible.add(focus.name);

  return visible;
};
