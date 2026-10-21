import type { PickingDetails, PickingGroup } from '../common/details-view.type.ts';
import { NONE_TEXT, NO_MATCH_TEXT } from '../common/details.const.ts';
import type { CandidateGroupModel, DetailsViews } from '../common/details.type.ts';
import type { DetailsContext, DetailsEnv, GraphDetailsDeps, ShownHint } from '../common/graph-details.type.ts';
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

const filteredOf = (view: PickingDetails, context: DetailsContext | null): TraceCandidates | null => {
  const candidates = context?.candidates ?? null;

  if (context === null || candidates === null) return null;

  return filteredCandidatesOf(candidates, context.drawn.infos, view.filter.value);
};

const renderGroup = (parts: PickingGroup, start: string, model: CandidateGroupModel, views: DetailsViews): void => {
  const items = views.candidateItems(model);

  parts.heading.textContent = candidateTitleOf(model.key, start, model.total);
  parts.empty.textContent = model.total === 0 ? NONE_TEXT : NO_MATCH_TEXT;
  parts.empty.hidden = items.length > 0;
  parts.list.replaceChildren(...items);
};

/** Rebuilds the candidate lists for the filter box's text; `false` when the context holds no candidates. */
export const renderPicking = (view: PickingDetails, start: string, context: DetailsContext, views: DetailsViews): boolean => {
  const { candidates } = context;
  const filtered = filteredOf(view, context);

  if (candidates === null || filtered === null) return false;

  const model = pickingModelOf(start, candidates, filtered);

  model.groups.forEach((group, index) => {
    const parts = view.groups[index];

    if (parts !== undefined) renderGroup(parts, start, group, views);
  });

  return true;
};

const pickInput = (name: string): InspectionInput => {
  const input: InspectionInput = { kind: 'pick', name };

  return input;
};

/** Enter picks the first candidate left; Escape only stops the search box clearing itself, the panel cancels. */
const onFilterKey = (event: KeyboardEvent, view: PickingDetails, env: DetailsEnv): void => {
  if (event.key === 'Escape') event.preventDefault();

  if (event.key !== 'Enter') return;

  const filtered = filteredOf(view, env.context());

  if (filtered === null) return;

  const name = firstCandidateOf(filtered);

  if (name !== null) env.deps.onInput(pickInput(name));
};

export const wirePicking = (view: PickingDetails, start: string, env: DetailsEnv): void => {
  const { deps } = env;
  const { filter } = view;
  const onPick = (event: Event): void => {
    const name = namedButtonOf(event)?.dataset['name'];

    if (name !== undefined) deps.onInput(pickInput(name));
  };
  const onFilter = (): void => {
    const context = env.context();

    if (context !== null) renderPicking(view, start, context, deps.views);

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
