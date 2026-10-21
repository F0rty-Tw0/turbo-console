import { codicon, iconButton, runButton, textElement } from './page-elements.ts';
import { fillRun } from './patch-run.ts';
import type { DryRunPhase, RunView, TaskCard } from '../../bridge/common/details-state.type.ts';
import type { CardRefs, FieldRow, RenderContext, RenderedCard, RunButtonFactory } from '../common/details-page.type.ts';
import { NONE_TEXT, RUNS_UNTIL_STOPPED_TEXT } from '../common/field-text.const.ts';
import { STOP_ICON_ID } from '../common/run-view.const.ts';
import { cacheText, definitionText, listText } from '../utils/field-text.util.ts';
import { safeToolIconId } from '../utils/run-view.util.ts';

const runButtonFor = (card: TaskCard, context: RenderContext): RunButtonFactory => {
  const { name, taskId } = card;
  const { bridge, focusTargets } = context;
  const stop = (): void => bridge.post({ type: 'stop', taskId });
  const run = (): void => bridge.post({ type: 'run', taskId });
  const runOrStop = (view: RunView): HTMLButtonElement => {
    if (view.isRunning) return runButton(STOP_ICON_ID, 'Stop', `Stop ${name}`, stop);

    return runButton('play', 'Run', `Run ${name}`, run);
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
    const pending = definitionText(card.command, phase);
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

/** The Tool row (spec 1c-c §4.6): the logo only when the host's icon id is one of the tool icon font's, else the name alone. */
const toolRows = (card: TaskCard): FieldRow[] => {
  const { tool } = card;

  if (tool === null) return [];

  const iconId = safeToolIconId(tool.iconId);

  if (iconId === null) return [['Tool', tool.title]];

  return [['Tool', tool.title, iconId]];
};

const turboRows = (card: TaskCard, phase: DryRunPhase): FieldRow[] => {
  const command = card.command ?? NONE_TEXT;
  const description = card.description ?? NONE_TEXT;
  const definition = definitionRows(card, phase);
  const tool = toolRows(card);
  const rows: FieldRow[] = [['Command', command], ...tool, ['Description', description], ...definition];

  return rows;
};

const runCommandRows = (runCommand: string | null): FieldRow[] => {
  if (runCommand === null) return [];

  const rows: FieldRow[] = [['Command', runCommand]];

  return rows;
};

/** A script card shows how it runs, then its body; a script the run flow refuses has no run command (spec 1c-b §4.10). */
const scriptRows = (card: TaskCard): FieldRow[] => {
  const runCommand = runCommandRows(card.runCommand);
  const script = card.command ?? NONE_TEXT;
  const description = card.description ?? NONE_TEXT;
  const tool = toolRows(card);
  const rows: FieldRow[] = [...runCommand, ['Script', script], ...tool, ['Description', description]];

  return rows;
};

const kindRows = (card: TaskCard, phase: DryRunPhase): FieldRow[] => {
  if (card.isTurboTask) return turboRows(card, phase);

  return scriptRows(card);
};

/** A plain `dd`, or with an icon id a `field-icon-value` one holding the codicon, then the value in a span (no text node between). */
const valueCell = (value: string, iconId: string | undefined): HTMLElement => {
  if (iconId === undefined) return textElement('dd', '', value);

  const cell = textElement('dd', 'field-icon-value', '');

  cell.append(codicon(iconId), textElement('span', '', value));

  return cell;
};

const fieldList = (card: TaskCard, phase: DryRunPhase): HTMLDListElement => {
  const list = document.createElement('dl');
  const cardRows = kindRows(card, phase);
  const dependents = listText(card.dependents, 'other');
  const rows: FieldRow[] = [...cardRows, ['Dependents', dependents]];

  list.className = 'fields';

  for (const [term, value, iconId] of rows) {
    list.append(textElement('dt', '', term), valueCell(value, iconId));
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

const cardActions = (card: TaskCard, refs: CardRefs, context: RenderContext): HTMLSpanElement => {
  const actions = textElement('span', 'card-actions', '');
  const copy = (): void => context.bridge.post({ type: 'copy', taskId: card.taskId });
  const copyButton = iconButton('copy', `Copy command for ${card.name}`, copy);

  context.focusTargets.set(`copy:${card.taskId}`, copyButton);
  actions.append(refs.runSlot, copyButton);

  return actions;
};

const cardHeader = (card: TaskCard, refs: CardRefs, context: RenderContext): HTMLElement => {
  const header = document.createElement('header');
  const title = textElement('h3', 'card-title', card.name);
  const actions = cardActions(card, refs, context);

  header.className = 'card-header';
  header.append(title, refs.status, actions);

  return header;
};

/** One task card; repo text goes in through `textContent` and `aria-label`/`title` only. */
export const taskCard = (card: TaskCard, phase: DryRunPhase, context: RenderContext): RenderedCard => {
  const element = textElement('section', 'card', '');
  const status = textElement('span', 'run-status', '');
  const runSlot = textElement('span', 'run-slot', '');
  const buildRunButton = runButtonFor(card, context);
  const { taskId } = card;
  const refs: CardRefs = { taskId, card: element, status, runSlot, runButton: buildRunButton };

  const header = cardHeader(card, refs, context);
  const fields = fieldList(card, phase);
  const badgeList = badges(card);
  const rendered: RenderedCard = { element, refs };

  fillRun(refs, card.run, context.runTexts);
  element.append(header, badgeList, fields);

  return rendered;
};
