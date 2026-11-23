import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { seededRandomOf } from './seeded-random.spec.util.ts';
import { NODE_HEIGHT } from '../../common/graph.const.ts';

type Pair = [number, number];

const PROTOTYPE_NAMES = ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'];

const PROTOTYPE_START = 20;

const ROOT_COUNT = 12;

const FORWARD_CHANCE = 0.85;

const SELF_LOOP_EVERY = 50;

const DANGLING_EDGES = 3;

const childOf = (id: string): ElkNode => {
  const width = 100 + (id.length % 7) * 10;
  const child: ElkNode = { id, width, height: NODE_HEIGHT };

  return child;
};

export const edgeOf = (source: string, target: string): ElkEdge => {
  const edge: ElkEdge = { id: `${source}>${target}`, sources: [source], targets: [target] };

  return edge;
};

export const fallbackGraphOf = (names: string[], edges: ElkEdge[]): ElkNode => {
  const children = names.map(childOf);
  const graph: ElkNode = { id: 'root', children, edges };

  return graph;
};

const nameOf = (index: number): string => PROTOTYPE_NAMES[index - PROTOTYPE_START] ?? `p${index}`;

/** The next random edge: any source; a target past the roots, or the source itself every 50 edges; mostly downward. */
const nextPairOf = (random: () => number, count: number, edgeIndex: number): Pair => {
  const source = Math.floor(random() * count);
  const picked = ROOT_COUNT + Math.floor(random() * (count - ROOT_COUNT));
  const isSelfLoop = edgeIndex % SELF_LOOP_EVERY === 0;
  const target = isSelfLoop ? source : picked;
  const isFlipped = target < source && random() < FORWARD_CHANCE;
  const forward: Pair = [source, target];
  const flipped: Pair = [target, source];

  return isFlipped ? flipped : forward;
};

/**
 * A random graph that is the same for the same seed: `count` children, `edgeCount` distinct source and target pairs,
 * mostly downward with some back edges (cycles), a self-loop every 50 edges, plus three edges to a missing child; at
 * least 12 roots and children named like `Object.prototype` members.
 */
export const seededGraphOf = (seed: number, count: number, edgeCount: number): ElkNode => {
  const random = seededRandomOf(seed);
  const names = Array.from({ length: count }, (_: unknown, index: number): string => nameOf(index));
  const pairs = new Set<string>();
  const edges: ElkEdge[] = [];

  while (edges.length < edgeCount) {
    const [from, to] = nextPairOf(random, count, edges.length);
    const key = `${from}>${to}`;
    const isRepeat = pairs.has(key);

    if (isRepeat) continue;

    pairs.add(key);
    edges.push(edgeOf(nameOf(from), nameOf(to)));
  }

  for (let index = 0; index < DANGLING_EDGES; index += 1) edges.push(edgeOf(nameOf(index), `missing-${index}`));

  return fallbackGraphOf(names, edges);
};
