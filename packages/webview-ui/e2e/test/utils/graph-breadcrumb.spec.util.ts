import { packageOf } from './graph-package.spec.util.ts';
import { positionsOf } from './graph-positions.spec.util.ts';
import type { GraphEdge, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';

const linkOf = (source: string, target: string): GraphEdge => {
  const edge: GraphEdge = { source, target };

  return edge;
};

/**
 * Folder `core` (three packages) linked with `a` three times, `b` three times (one of them `b -> core`), `c` twice, `d`
 * and `e` once each, plus one link inside `core`: the breadcrumb of a `core` focus names `a`, `b`, `c` and counts 2 more.
 */
export const breadcrumbState = (): GraphReady => {
  const edges: GraphEdge[] = [
    linkOf('a-pkg', 'core-1'),
    linkOf('a-pkg', 'core-2'),
    linkOf('a-pkg', 'core-3'),
    linkOf('core-1', 'b-pkg'),
    linkOf('core-2', 'b-pkg'),
    linkOf('b-pkg', 'core-3'),
    linkOf('core-1', 'c-pkg'),
    linkOf('core-2', 'c-pkg'),
    linkOf('core-1', 'd-pkg'),
    linkOf('core-2', 'e-pkg'),
    linkOf('core-1', 'core-2')
  ];
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    tasks: [],
    hash: 'f01d0004',
    packages: [
      packageOf('core-1', 'core/core-1'),
      packageOf('core-2', 'core/core-2'),
      packageOf('core-3', 'core/core-3'),
      packageOf('a-pkg', 'a/a-pkg'),
      packageOf('b-pkg', 'b/b-pkg'),
      packageOf('c-pkg', 'c/c-pkg'),
      packageOf('d-pkg', 'd/d-pkg'),
      packageOf('e-pkg', 'e/e-pkg')
    ],
    edges,
    positions: null,
    folderPositions: positionsOf([
      ['core-1', 0, 0],
      ['core-2', 150, 0],
      ['core-3', 300, 0],
      ['a-pkg', 0, 250],
      ['b-pkg', 200, 250],
      ['c-pkg', 400, 250],
      ['d-pkg', 600, 250],
      ['e-pkg', 800, 250]
    ]),
    atomGroups: []
  };

  return state;
};
