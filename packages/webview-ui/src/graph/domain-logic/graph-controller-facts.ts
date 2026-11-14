import type { FilteringFacts, LayoutEngine, ProbeFacts } from '../common/graph-probe.type.ts';
import type { ProbeFactParts } from '../common/probe-fact-parts.type.ts';

/** The task mode's selected task while it is on, else the package the inspection holds. */
const selectedOf = (parts: ProbeFactParts, filteringFacts: FilteringFacts): string | null => {
  const isTaskMode = parts.tasks.isActive();

  if (isTaskMode) return parts.tasks.selection.selected();

  return filteringFacts.selected();
};

const engineOf = (parts: ProbeFactParts): LayoutEngine | null => {
  const isTaskMode = parts.tasks.isActive();

  if (isTaskMode) return parts.tasks.layout.engine();

  return parts.packages.layouts.engine();
};

/** The facts the test probe reads off the page controller, each read when asked. */
export const probeFactsOf = (parts: ProbeFactParts): ProbeFacts => {
  const { frames, packages, tasks } = parts;
  const { filtering, layouts } = packages;
  const filteringFacts = filtering.facts();
  const facts: ProbeFacts = {
    firstFrameMs: (): number | null => frames.firstFrameMs(),
    layoutEngine: (): LayoutEngine | null => engineOf(parts),
    grouped: (): boolean => layouts.mode() === 'folders',
    atomToggleMs: (): number | null => tasks.layout.atoms.toggleMs(),
    ...filteringFacts,
    selected: (): string | null => selectedOf(parts, filteringFacts)
  };

  return facts;
};
