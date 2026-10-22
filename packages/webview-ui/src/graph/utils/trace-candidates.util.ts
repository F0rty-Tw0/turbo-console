import { walkFrom } from './walk.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { TraceCandidate, TraceCandidates } from '../common/trace.type.ts';

const byLinks = (a: TraceCandidate, b: TraceCandidate): number => a.steps - b.steps;

/** The visible packages other than `start`, grouped by whether `start` reaches them, they reach it, or neither. */
export const candidatesOf = (edges: GraphEdge[], start: string, visible: ReadonlySet<string>): TraceCandidates => {
  const forwardSteps = walkFrom(edges, start, 'dependencies').distances;
  const backwardSteps = walkFrom(edges, start, 'dependents').distances;
  const listed = [...visible];
  const names = listed.sort();
  const forward: TraceCandidate[] = [];
  const backward: TraceCandidate[] = [];
  const none: string[] = [];

  for (const name of names) {
    const forwardCount = forwardSteps.get(name);
    const backwardCount = backwardSteps.get(name);

    if (name === start) continue;

    if (forwardCount !== undefined) forward.push({ name, steps: forwardCount });
    else if (backwardCount !== undefined) backward.push({ name, steps: backwardCount });
    else none.push(name);
  }

  forward.sort(byLinks);
  backward.sort(byLinks);

  const candidates: TraceCandidates = { forward, backward, none };

  return candidates;
};
