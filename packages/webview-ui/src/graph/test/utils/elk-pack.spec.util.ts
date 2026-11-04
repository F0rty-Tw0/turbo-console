import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { sizeOf } from './elk-options.spec.util.ts';
import { childrenOf, idsOf } from './folder-boards.spec.util.ts';
import { LAYERING_DEFAULT } from '../../common/graph-layout.const.ts';
import { WRAPPER_ID_PREFIX } from '../../common/graph.const.ts';
import type { ElkLayering, ElkOptions } from '../../common/layout.type.ts';
import { elkEdgeOf } from '../../utils/elk-grouped-graph.util.ts';
import { groupedRootOptionsOf } from '../../utils/elk-options.util.ts';

/** The leaf count the pack specs build their root options for. */
export const PACK_LEAF_COUNT = 5;

/** A package leaf. */
export const leafNodeOf = (id: string): ElkNode => {
  const { width, height } = sizeOf();
  const leaf: ElkNode = { id, width, height };

  return leaf;
};

/** A compound holding `children`. */
export const compoundNodeOf = (id: string, children: ElkNode[]): ElkNode => {
  const compound: ElkNode = { id, children };

  return compound;
};

/** An edge from `source` to `target`. */
export const linkOf = (source: string, target: string): ElkEdge => elkEdgeOf({ source, target });

/** The id of the wrapper of component `index`. */
export const wrapperIdOf = (index: number): string => `${WRAPPER_ID_PREFIX}${index}`;

/** A grouped-style root (`INCLUDE_CHILDREN`) over `children` with every edge at the root. */
export const packRootOf = (children: ElkNode[], edges: ElkEdge[], layering: ElkLayering = LAYERING_DEFAULT): ElkNode => {
  const layoutOptions = groupedRootOptionsOf(PACK_LEAF_COUNT, layering);
  const root: ElkNode = { id: 'root', layoutOptions, children, edges };

  return root;
};

/** The wrappers of a packed root, the ids of the members (the children) of each wrapper. */
export const wrapperMemberIdsOf = (packed: ElkNode): string[][] => {
  const memberIdsOf = (wrapper: ElkNode): string[] => idsOf(childrenOf(wrapper));

  return childrenOf(packed).map(memberIdsOf);
};

/** The edges held by each wrapper of a packed root. */
export const wrapperEdgesOf = (packed: ElkNode): ElkEdge[][] => {
  const wrappers = childrenOf(packed);
  const edgesOf = (wrapper: ElkNode): ElkEdge[] => wrapper.edges ?? [];

  return wrappers.map(edgesOf);
};

/** The options a packed root carries: the grouped root's, set to rectpacking with spacing 48 and aspect 1. */
export const packedRootOptionsOf = (leafCount: number, layering: ElkLayering): ElkOptions => {
  const root = groupedRootOptionsOf(leafCount, layering);
  const options = {
    ...root,
    'elk.algorithm': 'rectpacking',
    'elk.aspectRatio': '1',
    'elk.spacing.nodeNode': '48',
    'elk.hierarchyHandling': 'SEPARATE_CHILDREN'
  };

  return options;
};

/** The options a wrapper carries: the grouped root's, with no padding. */
export const expectedWrapperOptionsOf = (leafCount: number, layering: ElkLayering): ElkOptions => {
  const root = groupedRootOptionsOf(leafCount, layering);
  const options = { ...root, 'elk.padding': '[top=0,left=0,bottom=0,right=0]' };

  return options;
};
