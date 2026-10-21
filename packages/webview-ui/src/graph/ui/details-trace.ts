/* eslint-disable local/no-unused-exports -- first imported by Task 3.4 */
import { actionButton, leadOf, markOf, nameButton, viewBase } from './details-parts.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { TraceDetails } from '../common/details-view.type.ts';
import { CLEAR_TRACE_LABEL, DEPENDS_ON_TEXT, SHOW_LABEL, SWAP_ENDS_LABEL } from '../common/details.const.ts';
import type { TraceStepModel, TraceViewModel } from '../common/details.type.ts';
import { showLabelOf } from '../utils/controls-text.util.ts';
import { traceSummaryOf, traceTitleOf } from '../utils/details-text.util.ts';

/** A ghost: the hidden package's name, its hidden mark, and Show when the filters can bring it back. */
const ghostRow = (row: HTMLElement, step: TraceStepModel): void => {
  const name = textElement('span', 'trace-name', step.name);
  const mark = markOf();

  row.append(name, mark);

  if (!step.isShowable) return;

  const show = actionButton(SHOW_LABEL);
  const showLabel = showLabelOf(step.name);

  show.dataset['name'] = step.name;
  show.dataset['action'] = 'show';
  show.setAttribute('aria-label', showLabel);
  row.append(show);
};

const visibleRow = (row: HTMLElement, step: TraceStepModel): void => {
  const select = nameButton(step.name);

  select.dataset['action'] = 'select';
  row.append(select);
};

/** A step on the rail; every step but the last says it depends on the next. */
const stepItem = (step: TraceStepModel, index: number, steps: TraceStepModel[]): HTMLLIElement => {
  const li = textElement('li', 'trace-step', '');
  const rail = textElement('span', 'trace-rail', '');
  const body = textElement('div', 'trace-body', '');
  const row = textElement('div', 'trace-row', '');
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const isEnd = isFirst || isLast;

  rail.setAttribute('aria-hidden', 'true');
  li.classList.toggle('is-end', isEnd);
  li.classList.toggle('is-ghost', !step.isVisible);

  if (step.isVisible) {
    visibleRow(row, step);
  } else {
    ghostRow(row, step);
  }

  body.append(row);
  li.append(rail, body);

  if (isLast) return li;

  const link = textElement('p', 'trace-link', DEPENDS_ON_TEXT);

  body.append(link);

  return li;
};

/** The trace's step rows; also used to rebuild the list in place when a ghost is shown. */
export const stepItems = (steps: TraceStepModel[]): HTMLLIElement[] => steps.map(stepItem);

/** A trace: its summary, the steps from dependent to dependency, then Clear trace and Swap ends. */
export const traceView = (model: TraceViewModel, isOverlay: boolean): TraceDetails => {
  const title = traceTitleOf(model.start, model.end);
  const base = viewBase('trace', title, isOverlay);
  const summary = traceSummaryOf(model.start, model.end, model.direction, model.steps.length);
  const lead = leadOf(summary);
  const steps = textElement('ol', 'trace-steps', '');
  const items = stepItems(model.steps);
  const actions = textElement('div', 'details-actions', '');
  const clear = actionButton(CLEAR_TRACE_LABEL);
  const swap = actionButton(SWAP_ENDS_LABEL);

  steps.append(...items);
  actions.append(clear, swap);
  base.root.append(lead, steps, actions);

  const view: TraceDetails = { ...base, kind: 'trace', lead, steps, clear, swap };

  return view;
};
