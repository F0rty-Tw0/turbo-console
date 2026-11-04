import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { PACK_ASPECT, PACK_SPACING_PX } from '../common/graph-layout.const.ts';
import { WRAPPER_ID_PREFIX } from '../common/graph.const.ts';

type IdPair = [string, string];

const NO_PADDING = '[top=0,left=0,bottom=0,right=0]';

/** The id of `node` and of every node below it. */
const idsUnder = (node: ElkNode): string[] => {
  const children = node.children ?? [];
  const below = children.flatMap(idsUnder);

  return [node.id, ...below];
};

/** Each id at any depth, paired with the id of the root child it sits under. */
const topLevelIdsOf = (children: ElkNode[]): Map<string, string> => {
  const pairsOf = (top: ElkNode): IdPair[] => {
    const pairOf = (id: string): IdPair => [id, top.id];

    return idsUnder(top).map(pairOf);
  };
  const pairs = children.flatMap(pairsOf);

  return new Map(pairs);
};

/** The root child that holds `end`, or `undefined` when `end` is not in the graph. */
const topOfEnd = (end: string | undefined, topOf: Map<string, string>): string | undefined => {
  if (end === undefined) return undefined;

  return topOf.get(end);
};

/** The root children grouped by the root-held links between their leaves at any depth, in the order of each group's first child. */
const componentsOf = (children: ElkNode[], edges: ElkEdge[], topOf: Map<string, string>): ElkNode[][] => {
  const selfPairOf = (child: ElkNode): IdPair => [child.id, child.id];
  const parents = new Map(children.map(selfPairOf));
  const representativeOf = (id: string): string => {
    const parent = parents.get(id);

    if (parent === undefined || parent === id) return id;

    const representative = representativeOf(parent);

    // Path compression: later lookups from this id skip the chain.
    parents.set(id, representative);

    return representative;
  };
  const join = (edge: ElkEdge): void => {
    const from = topOfEnd(edge.sources[0], topOf);
    const to = topOfEnd(edge.targets[0], topOf);

    if (from === undefined || to === undefined) return;

    parents.set(representativeOf(from), representativeOf(to));
  };
  const components = new Map<string, ElkNode[]>();
  const place = (child: ElkNode): void => {
    const key = representativeOf(child.id);
    const members = components.get(key) ?? [];

    components.set(key, [...members, child]);
  };

  edges.forEach(join);
  children.forEach(place);

  const lists = components.values();

  return [...lists];
};

/** The padding-free layered box around one component; it keeps the root's options, so its layering and thoroughness are the root's. */
const wrapperOf = (members: ElkNode[], index: number, root: ElkNode, topOf: Map<string, string>): ElkNode => {
  const memberIds = members.map((member) => member.id);
  const ids = new Set(memberIds);
  const isOwn = (edge: ElkEdge): boolean => {
    const top = topOfEnd(edge.sources[0], topOf);

    return top !== undefined && ids.has(top);
  };
  const rootEdges = root.edges ?? [];
  const edges = rootEdges.filter(isOwn);
  const layoutOptions = { ...root.layoutOptions, 'elk.padding': NO_PADDING };
  const wrapper: ElkNode = { id: `${WRAPPER_ID_PREFIX}${index}`, layoutOptions, children: members, edges };

  return wrapper;
};

/**
 * Unlinked components of a root laid out with `INCLUDE_CHILDREN` each get a wrapper, and rectpacking arranges the wrappers
 * near-square. A component is the root children joined by a root-held link between any of their leaves, at any depth. Any
 * other root, or one with fewer than two components, comes back as it is. The wrappers copy the root's options, so a root's
 * layering and thoroughness reach the layered layout inside each wrapper.
 */
export const packComponentsOf = (root: ElkNode): ElkNode => {
  const isCompound = root.layoutOptions?.['elk.hierarchyHandling'] === 'INCLUDE_CHILDREN';

  if (!isCompound) return root;

  const children = root.children ?? [];
  const topOf = topLevelIdsOf(children);
  const components = componentsOf(children, root.edges ?? [], topOf);

  if (components.length < 2) return root;

  const wrapperAt = (members: ElkNode[], index: number): ElkNode => wrapperOf(members, index, root, topOf);
  const wrappers = components.map(wrapperAt);
  const layoutOptions = {
    ...root.layoutOptions,
    'elk.algorithm': 'rectpacking',
    'elk.aspectRatio': String(PACK_ASPECT),
    'elk.spacing.nodeNode': String(PACK_SPACING_PX),
    'elk.hierarchyHandling': 'SEPARATE_CHILDREN'
  };
  const packed: ElkNode = { id: root.id, layoutOptions, children: wrappers, edges: [] };

  return packed;
};
