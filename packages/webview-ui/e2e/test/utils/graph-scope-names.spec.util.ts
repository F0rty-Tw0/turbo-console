import { packageOf } from './graph-package.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import { ROOT_LABEL_STUB } from '../stubs/graph-scope-names.stub.ts';

/** The `[id, text]` of each probe node, in probe order. */
export const textsOf = (nodes: ProbeNode[]): string[][] => nodes.map(({ id, text }) => [id, text]);

const scopedOf = (name: string, bareName: string, path: string): GraphPackage => {
  const base = packageOf(name, path);
  const pkg: GraphPackage = { ...base, bareName };

  return pkg;
};

/**
 * `@org/app` (bare `app`), `@org/lib` (bare `lib`) and the unscoped `tool`, each at `packages/<bare>`, so the one folder
 * lists them in that order; no layout cached, scripts shown, scopes shown or hidden.
 */
export const scopedNamesState = (scopeShown: boolean): GraphReady => {
  const packages = [
    scopedOf('@org/app', 'app', 'packages/app'),
    scopedOf('@org/lib', 'lib', 'packages/lib'),
    packageOf('tool', 'packages/tool')
  ];
  const edge: GraphEdge = { source: '@org/app', target: '@org/lib' };
  const edges = [edge];
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    scopeShown,
    scriptsShown: true,
    predictionShown: false,
    affectedShown: false,
    hash: '7a5c0501',
    packages,
    edges,
    positions: null,
    routes: null,
    folderRoutes: null,
    folderPositions: null,
    tasks: [],
    atomGroups: []
  };

  return state;
};

/** `scopedNamesState` with scopes shown plus the monorepo root `//` at the workspace root, labelled `ROOT_LABEL_STUB`. */
export const rootNamedState = (): GraphReady => {
  const base = scopedNamesState(true);
  const root = scopedOf('//', ROOT_LABEL_STUB, '');
  const packages = [...base.packages, root];
  const state: GraphReady = { ...base, hash: '0f2a91c4', packages };

  return state;
};
