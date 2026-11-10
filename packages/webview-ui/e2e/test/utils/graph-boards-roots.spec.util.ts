import { packageOf } from './graph-package.spec.util.ts';
import { positionsOf } from './graph-positions.spec.util.ts';
import type { GraphEdge, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';

/** `r` in the root folder, `p` in a real `(root)` folder and `b` in `apps`, linked `p` to `r` and `b` to `p`, on fixed grouped centres. */
export const rootFoldersState = (): GraphReady => {
  const edges: GraphEdge[] = [
    { source: 'p', target: 'r' },
    { source: 'b', target: 'p' }
  ];
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    scopeShown: true,
    scriptsShown: true,
    predictionShown: false,
    tasks: [],
    hash: 'f01d0010',
    packages: [packageOf('r', 'r'), packageOf('p', '(root)/p'), packageOf('b', 'apps/b')],
    edges,
    positions: null,
    routes: null,
    folderRoutes: null,
    folderPositions: positionsOf([
      ['r', 0, 0],
      ['p', 200, 0],
      ['b', 100, 300]
    ]),
    atomGroups: []
  };

  return state;
};

/** `a` in a `__proto__` folder, `b` and a package named `constructor` in `x`, linked `b` to `a` and `constructor` to `b`. */
export const protoFolderState = (): GraphReady => {
  const edges: GraphEdge[] = [
    { source: 'b', target: 'a' },
    { source: 'constructor', target: 'b' }
  ];
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    scopeShown: true,
    scriptsShown: true,
    predictionShown: false,
    tasks: [],
    hash: 'f01d0011',
    packages: [packageOf('a', '__proto__/a'), packageOf('b', 'x/b'), packageOf('constructor', 'x/constructor')],
    edges,
    positions: null,
    routes: null,
    folderRoutes: null,
    folderPositions: positionsOf([
      ['a', 0, 0],
      ['b', 0, 300],
      ['constructor', 200, 300]
    ]),
    atomGroups: []
  };

  return state;
};

/** `a` and `c` in `f1`, `b` in `f2` and `d` in `f3`, linked `a` to `b`, `b` to `c` and `b` to `d`, on fixed grouped centres so no ELK run. */
export const threeFoldersState = (): GraphReady => {
  const edges: GraphEdge[] = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'b', target: 'd' }
  ];
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    scopeShown: true,
    scriptsShown: true,
    predictionShown: false,
    tasks: [],
    hash: 'f01d0012',
    packages: [packageOf('a', 'f1/a'), packageOf('c', 'f1/c'), packageOf('b', 'f2/b'), packageOf('d', 'f3/d')],
    edges,
    positions: null,
    routes: null,
    folderRoutes: null,
    folderPositions: positionsOf([
      ['a', 0, 0],
      ['c', 200, 0],
      ['b', 100, 300],
      ['d', 100, 600]
    ]),
    atomGroups: []
  };

  return state;
};
