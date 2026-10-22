import type { ProbeState } from '../../../src/graph/common/graph-probe.type.ts';
import type { NodeStates } from '../../common/graph.type.ts';

const dimmedEntry = (name: string): [string, ProbeState] => [name, 'dimmed'];

/** Every name reads `dimmed` unless `lit` gives it another state. */
export const dimmedExcept = (names: string[], lit: NodeStates): NodeStates => {
  const dimmed = Object.fromEntries(names.map(dimmedEntry));
  const states: NodeStates = { ...dimmed, ...lit };

  return states;
};
