import { matchesSearch } from './search.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { TraceCandidates } from '../common/trace.type.ts';

/** `''` keeps every candidate; a filter keeps those whose package record matches and drops one with no record. */
export const filteredCandidatesOf = (candidates: TraceCandidates, packages: GraphPackage[], filter: string): TraceCandidates => {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const keepsAll = filter === '';
  const isKept = (name: string): boolean => {
    const record = byName.get(name);
    const isMatch = record !== undefined && matchesSearch(record, filter);

    return keepsAll || isMatch;
  };
  const forward = candidates.forward.filter((candidate) => isKept(candidate.name));
  const backward = candidates.backward.filter((candidate) => isKept(candidate.name));
  const none = candidates.none.filter(isKept);
  const filtered: TraceCandidates = { forward, backward, none };

  return filtered;
};

/** The first listed candidate: forward, else backward, else unrelated, else `null`. */
export const firstCandidateOf = (candidates: TraceCandidates): string | null => {
  const forward = candidates.forward.at(0)?.name;
  const backward = candidates.backward.at(0)?.name;
  const none = candidates.none.at(0);

  return forward ?? backward ?? none ?? null;
};

/** The names a trace could end at: those in `forward` and `backward`. */
export const litCandidatesOf = (candidates: TraceCandidates): ReadonlySet<string> => {
  const lit = [...candidates.forward, ...candidates.backward];
  const names = lit.map((candidate) => candidate.name);

  return new Set(names);
};
