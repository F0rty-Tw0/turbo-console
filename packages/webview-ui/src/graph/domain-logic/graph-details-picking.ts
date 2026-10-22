import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { PickingDetails, PickingGroup } from '../common/details-view.type.ts';
import { NONE_TEXT, NO_MATCH_TEXT } from '../common/details.const.ts';
import type { CandidateGroupModel, DetailsViews } from '../common/details.type.ts';
import type { DetailsEnv, GraphDetailsDeps, ShownHint, ShownPicking } from '../common/graph-details.type.ts';
import type { Inspection, InspectionInput } from '../common/inspection.type.ts';
import type { TraceCandidates } from '../common/trace.type.ts';
import { filteredCandidatesOf, firstCandidateOf } from '../utils/candidate-filter.util.ts';
import { pickingModelOf } from '../utils/details-model.util.ts';
import { candidateTitleOf } from '../utils/details-text.util.ts';

const CANCEL: InspectionInput = { kind: 'cancel' };

/** The button a delegated click landed on, when it carries a `data-name`. */
export const namedButtonOf = (event: Event): HTMLButtonElement | null => {
  const { target } = event;

  if (!(target instanceof Element)) return null;

  return target.closest<HTMLButtonElement>('button[data-name]');
};

const filteredOf = (view: PickingDetails, picking: ShownPicking, packages: GraphPackage[]): TraceCandidates => {
  return filteredCandidatesOf(picking.candidates, packages, view.filter.value);
};

/** The shown picking and the drawn packages at event time; `null` once the panel shows something else. */
const pickingAt = (env: DetailsEnv): [ShownPicking, GraphPackage[]] | null => {
  const shown = env.shown();
  const context = env.context();

  if (shown?.kind !== 'picking' || context === null) return null;

  return [shown, context.drawn.infos];
};

const renderGroup = (parts: PickingGroup, start: string, model: CandidateGroupModel, views: DetailsViews): void => {
  const items = views.candidateItems(model);

  parts.heading.textContent = candidateTitleOf(model.key, start, model.total);
  parts.empty.textContent = model.total === 0 ? NONE_TEXT : NO_MATCH_TEXT;
  parts.empty.hidden = items.length > 0;
  parts.list.replaceChildren(...items);
};

/** Rebuilds the candidate lists for the filter box's text. */
export const renderPicking = (view: PickingDetails, picking: ShownPicking, packages: GraphPackage[], views: DetailsViews): void => {
  const { start, candidates } = picking;
  const filtered = filteredOf(view, picking, packages);
  const model = pickingModelOf(start, candidates, filtered);

  model.groups.forEach((group, index) => {
    const parts = view.groups[index];

    if (parts !== undefined) renderGroup(parts, start, group, views);
  });
};

const pickInput = (name: string): InspectionInput => {
  const input: InspectionInput = { kind: 'pick', name };

  return input;
};

/** Enter picks the first candidate left; Escape only stops the search box clearing itself, the panel cancels. */
const onFilterKey = (event: KeyboardEvent, view: PickingDetails, env: DetailsEnv): void => {
  if (event.key === 'Escape') event.preventDefault();

  const at = pickingAt(env);

  if (event.key !== 'Enter' || at === null) return;

  const filtered = filteredOf(view, ...at);
  const name = firstCandidateOf(filtered);

  if (name !== null) env.deps.onInput(pickInput(name));
};

export const wirePicking = (view: PickingDetails, env: DetailsEnv): void => {
  const { deps } = env;
  const { filter } = view;
  const onPick = (event: Event): void => {
    const name = namedButtonOf(event)?.dataset['name'];

    if (name !== undefined) deps.onInput(pickInput(name));
  };
  const onFilter = (): void => {
    const at = pickingAt(env);

    if (at !== null) renderPicking(view, ...at, deps.views);

    deps.onFilter(filter.value);
  };

  for (const group of view.groups) group.list.addEventListener('click', onPick);

  view.cancel.addEventListener('click', (): void => deps.onInput(CANCEL));
  filter.addEventListener('input', onFilter);
  filter.addEventListener('keydown', (event): void => onFilterKey(event, view, env));
};

/** The canvas hint follows a picking inspection; the shown hint stays while its start and nudge are the same. */
export const shownHintOf = (hint: ShownHint | null, inspection: Inspection, deps: GraphDetailsDeps): ShownHint | null => {
  const isPicking = inspection.kind === 'picking';
  const isSame = isPicking && hint?.start === inspection.start && hint.isNudged === inspection.isNudged;

  if (isSame) return hint;

  hint?.element.remove();

  if (inspection.kind !== 'picking') return null;

  const { start, isNudged } = inspection;
  const element = deps.views.hint(start, isNudged);
  const shown: ShownHint = { element, start, isNudged };

  deps.page.container.append(element);

  return shown;
};
