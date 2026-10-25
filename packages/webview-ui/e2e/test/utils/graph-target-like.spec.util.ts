import { packagesOf } from './graph-package.spec.util.ts';
import type { GraphEdge, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';

const LIB_COUNT = 4;

const APP_COUNT = 3;

const HUBS = ['hub', 'util-a', 'util-b'];

const HUB_ONLY = ['hub'];

const LIBS_NEEDING_UTILS = new Set(['lib-1', 'lib-2']);

/** `1` to `count`, in order. */
const ordinals = (count: number): number[] => {
  const slots = Array.from({ length: count });
  const indexes = slots.keys();

  return Array.from(indexes, (index): number => index + 1);
};

const numbered = (prefix: string, count: number): string[] => {
  const nameOf = (own: number): string => `${prefix}-${own}`;

  return ordinals(count).map(nameOf);
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
  const featOf = (own: number): GraphEdge[] => {
    const next = (own % LIB_COUNT) + 1;

    return edgesFrom(`feat-${own}`, [`lib-${own}`, `lib-${next}`]);
  };

  return ordinals(LIB_COUNT).flatMap(featOf);
};

/** Layer 3: `app-i` needs `feat-i` and `feat-(i + 1)`. */
const appEdges = (): GraphEdge[] => {
  const appOf = (own: number): GraphEdge[] => edgesFrom(`app-${own}`, [`feat-${own}`, `feat-${own + 1}`]);

  return ordinals(APP_COUNT).flatMap(appOf);
};

/** The 14-package graph of `repo-gen` `TARGET_LIKE` (depth 3, hub fan-in 4), with no randomness and no positions. */
export const targetLikeState = (): GraphReady => {
  const libs = numbered('lib', LIB_COUNT);
  const feats = numbered('feat', LIB_COUNT);
  const apps = numbered('app', APP_COUNT);
  const libLinks = libEdges();
  const featLinks = featEdges();
  const appLinks = appEdges();
  const packages = packagesOf([...HUBS, ...libs, ...feats, ...apps]);
  const edges = [...libLinks, ...featLinks, ...appLinks];
  const state: GraphReady = {
    kind: 'graph',
    hash: '7a7a7a7a',
    packages,
    edges,
    positions: null,
    folderPositions: null,
    tasks: [],
    atomGroups: []
  };

  return state;
};
