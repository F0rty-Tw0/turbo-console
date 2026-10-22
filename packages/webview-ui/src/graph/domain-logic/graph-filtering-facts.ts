import type { FactsFolders, FactsInspection, FilteringFacts, FilteringTimes } from '../common/graph-probe.type.ts';
import type { Inspection } from '../common/inspection.type.ts';

/** The filtering's probe facts: its own timings, then the inspection's and the folders', read when the probe asks. */
export const filteringFactsOf = (inspection: FactsInspection, folders: FactsFolders, times: FilteringTimes): FilteringFacts => {
  const facts: FilteringFacts = {
    ...times,
    selected: (): string | null => inspection.selected(),
    inspection: (): Inspection => inspection.current(),
    detailsBuiltMs: (): number | null => inspection.builtMs('package'),
    pickingBuiltMs: (): number | null => inspection.builtMs('picking'),
    traceMs: (): number | null => inspection.builtMs('trace'),
    toggleMs: (): number | null => folders.toggleMs()
  };

  return facts;
};
