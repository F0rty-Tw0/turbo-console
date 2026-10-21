import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { Closure } from '../common/closure.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';

const isLit = (name: string, selected: string, closure: Closure): boolean => {
  const isNeeded = closure.dependencies.has(name);
  const isNeeding = closure.dependents.has(name);

  return name === selected || isNeeded || isNeeding;
};

/** `selected` for the selection, `highlighted` for its closure, `dimmed` for the rest, `normal` with no selection. */
export const nodeStateOf = (name: string, selected: string | null, closure: Closure | null): ProbeState => {
  if (selected === null || closure === null) return 'normal';

  if (name === selected) return 'selected';

  const isInClosure = isLit(name, selected, closure);

  return isInClosure ? 'highlighted' : 'dimmed';
};

/** `highlighted` when both ends are the selection or in its closure, else `dimmed`; `normal` with no selection. */
export const edgeStateOf = (edge: GraphEdge, selected: string | null, closure: Closure | null): ProbeState => {
  if (selected === null || closure === null) return 'normal';

  const isSourceLit = isLit(edge.source, selected, closure);
  const isTargetLit = isLit(edge.target, selected, closure);

  return isSourceLit && isTargetLit ? 'highlighted' : 'dimmed';
};
