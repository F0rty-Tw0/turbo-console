import type { GraphEdge } from '../../../src/bridge/common/graph-state.type.ts';
import type { PackageGraphState } from '../../common/graph.type.ts';

const LIB_COUNT = 4;

const APP_COUNT = 3;

const HUBS = ['hub', 'util-a', 'util-b'];

const HUB_ONLY = ['hub'];

const LIBS_NEEDING_UTILS = new Set(['lib-1', 'lib-2']);

const numbered = (prefix: string, count: number): string[] => {
  const nameOf = (_: unknown, index: number): string => `${prefix}-${index + 1}`;

  return Array.from({ length: count }, nameOf);
};

const edgesFrom = (source: string, targets: string[]): GraphEdge[] => {
  const edgeTo = (target: string): GraphEdge => {
    const edge: GraphEdge = { source, target };

    return edge;
  };

  return targets.map(edgeTo);
};

/** Layer 1: each lib needs the hub; `lib-1` and `lib-2` also need both utils. */
const libEdges = (): GraphEdge[] => {
  const libs = numbered('lib', LIB_COUNT);
  const edgesOf = (lib: string): GraphEdge[] => {
    const targets = LIBS_NEEDING_UTILS.has(lib) ? HUBS : HUB_ONLY;

    return edgesFrom(lib, targets);
  };

  return libs.flatMap(edgesOf);
};

/** Layer 2: `feat-i` needs `lib-i` and `lib-(i % 4) + 1`. */
const featEdges = (): GraphEdge[] => {
  const featOf = (_: unknown, index: number): GraphEdge[] => {
    const own = index + 1;
    const next = (own % LIB_COUNT) + 1;

    return edgesFrom(`feat-${own}`, [`lib-${own}`, `lib-${next}`]);
  };
  const perFeat = Array.from({ length: LIB_COUNT }, featOf);

  return perFeat.flat();
};

/** Layer 3: `app-i` needs `feat-i` and `feat-(i + 1)`. */
const appEdges = (): GraphEdge[] => {
  const appOf = (_: unknown, index: number): GraphEdge[] => {
    const own = index + 1;

    return edgesFrom(`app-${own}`, [`feat-${own}`, `feat-${own + 1}`]);
  };
  const perApp = Array.from({ length: APP_COUNT }, appOf);

  return perApp.flat();
};

/** The 14-package graph of `repo-gen` `TARGET_LIKE` (depth 3, hub fan-in 4), with no randomness and no positions. */
export const targetLikeState = (): PackageGraphState => {
  const libs = numbered('lib', LIB_COUNT);
  const feats = numbered('feat', LIB_COUNT);
  const apps = numbered('app', APP_COUNT);
  const libLinks = libEdges();
  const featLinks = featEdges();
  const appLinks = appEdges();
  const packages = [...HUBS, ...libs, ...feats, ...apps];
  const edges = [...libLinks, ...featLinks, ...appLinks];
  const state: PackageGraphState = { kind: 'graph', hash: '7a7a7a7a', packages, edges, positions: null };

  return state;
};
