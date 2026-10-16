import { iconButton, textElement } from './page-elements.ts';
import { fillRun } from './patch-run.ts';
import type { DryRunPhase, RunView, TaskCard } from '../../bridge/common/details-state.type.ts';
import type { CardRefs, FieldRow, RenderContext, RenderedCard, RunButtonFactory } from '../common/details-page.type.ts';
import { NONE_TEXT, RUNS_UNTIL_STOPPED_TEXT } from '../common/field-text.const.ts';
import { cacheText, definitionText, listText } from '../utils/field-text.util.ts';

const runButtonFor = (card: TaskCard, context: RenderContext): RunButtonFactory => {
  const { name, taskId } = card;
  const { bridge, focusTargets } = context;
  const stop = (): void => bridge.post({ type: 'stop', taskId });
  const run = (): void => bridge.post({ type: 'run', taskId });
  const runOrStop = (view: RunView): HTMLButtonElement => {
    if (view.isRunning) return iconButton('debug-stop', `Stop ${name}`, stop);

    return iconButton('play', `Run ${name}`, run);
  };

  return (view: RunView): HTMLButtonElement => {
    const button = runOrStop(view);

    focusTargets.set(`run:${taskId}`, button);

    return button;
  };
};

const definitionRows = (card: TaskCard, phase: DryRunPhase): FieldRow[] => {
  const { definition } = card;

  if (definition === null) {
    const pending = definitionText(card, phase);
    const pendingRows: FieldRow[] = [['Definition', pending]];

    return pendingRows;
  }

  const rows: FieldRow[] = [
    ['Cache', cacheText(card.cacheStatus, phase)],
    ['Inputs', listText(definition.inputs, 'inputs')],
    ['Outputs', listText(definition.outputs, 'other')],
    ['Depends on', listText(definition.dependsOn, 'other')],
    ['Env', listText(definition.env, 'other')]
  ];

  return rows;
};

const fieldList = (card: TaskCard, phase: DryRunPhase): HTMLDListElement => {
  const list = document.createElement('dl');
  const command = card.command ?? NONE_TEXT;
  const description = card.description ?? NONE_TEXT;
  const definition = definitionRows(card, phase);
  const dependents = listText(card.dependents, 'other');
  const rows: FieldRow[] = [['Command', command], ['Description', description], ...definition, ['Dependents', dependents]];

  list.className = 'fields';

  for (const [term, value] of rows) {
    list.append(textElement('dt', '', term), textElement('dd', '', value));
  }

  return list;
};

/** The badges come from the dry run; "runs until stopped" from the model, so it shows before and without one. */
const badges = (card: TaskCard): HTMLUListElement => {
  const { definition } = card;
  const list = textElement('ul', 'badges', '');

  if (definition?.cache === true) list.append(textElement('li', 'badge', 'Cacheable'));

  if (definition?.persistent === true) list.append(textElement('li', 'badge', 'Continuous'));

  if (card.persistent) list.append(textElement('li', 'badge-note', RUNS_UNTIL_STOPPED_TEXT));

  return list;
};

/** A task that is no turbo task has no turbo command, so its card has no Copy button. */
const cardActions = (card: TaskCard, refs: CardRefs, context: RenderContext): HTMLSpanElement => {
  const actions = textElement('span', 'card-actions', '');

  actions.append(refs.runSlot);

  if (!card.isTurboTask) return actions;

  const copy = (): void => context.bridge.post({ type: 'copy', taskId: card.taskId });
  const copyButton = iconButton('copy', `Copy command for ${card.name}`, copy);

  context.focusTargets.set(`copy:${card.taskId}`, copyButton);
  actions.append(copyButton);

  return actions;
};

const cardHeader = (card: TaskCard, refs: CardRefs, context: RenderContext): HTMLElement => {
  const header = document.createElement('header');
  const actions = cardActions(card, refs, context);
  const title = textElement('h2', 'card-title', card.name);

  header.className = 'card-header';
  header.append(title, refs.status, actions);

  return header;
};

/** One task card; repo text goes in through `textContent` and `aria-label`/`title` only. */
export const taskCard = (card: TaskCard, phase: DryRunPhase, context: RenderContext): RenderedCard => {
  const element = textElement('section', 'card', '');
  const status = textElement('span', 'run-status', '');
  const runSlot = textElement('span', 'run-slot', '');
  const runButton = runButtonFor(card, context);
  const { taskId, isTurboTask } = card;
  const refs: CardRefs = { taskId, isTurboTask, status, runSlot, runButton };
  const header = cardHeader(card, refs, context);
  const fields = fieldList(card, phase);
  const badgeList = badges(card);
  const rendered: RenderedCard = { element, refs };

  fillRun(refs, card.run, context.runTexts);
  element.append(header, badgeList, fields);

  return rendered;
};
