import { chipList, commandBlock } from './card-parts.ts';
import { iconButton, runButton } from './page-elements.ts';
import { fillRun } from './patch-run.ts';
import type { DryRunPhase, RunView, TaskCard } from '../../bridge/common/details-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { CardRefs, FieldRow, FieldValue, RenderContext, RenderedCard, RunButtonFactory } from '../common/details-page.type.ts';
import { STOP_ICON_ID } from '../common/run-view.const.ts';
import { cacheValue, definitionValue, descriptionText, listValue, plainValue } from '../utils/field-text.util.ts';

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

const turboFacts = (card: TaskCard, phase: DryRunPhase): FieldRow[] => {
  const { definition } = card;

  if (definition === null) {
    const definitionFact = definitionValue(card.command, phase);
    const pendingFacts: FieldRow[] = [['Definition', definitionFact]];

    return pendingFacts;
  }

  const facts: FieldRow[] = [
    ['Cache', cacheValue(card.cacheStatus, phase)],
    ['Inputs', listValue(definition.inputs, 'inputs')],
    ['Outputs', listValue(definition.outputs, 'other')],
    ['Depends on', listValue(definition.dependsOn, 'other')],
    ['Env', listValue(definition.env, 'other')]
  ];

  return facts;
};

/** The Script fact only when no block already shows the body: the block shows `runCommand`, or there is no block at all. */
const scriptFacts = (card: TaskCard): FieldRow[] => {
  const bodyIsBlock = card.runCommand === null && card.command !== null;

  if (bodyIsBlock) return [];

  const script = plainValue(card.command, true);
  const facts: FieldRow[] = [['Script', script]];

  return facts;
};

const kindFacts = (card: TaskCard, phase: DryRunPhase): FieldRow[] => {
  if (card.isTurboTask) return turboFacts(card, phase);

  return scriptFacts(card);
};

const blockOf = (label: string, text: string | null): HTMLDivElement[] => {
  if (text === null) return [];

  const block = commandBlock(label, text);
  const blocks = [block];

  return blocks;
};

/** Turbo: the command. Script: how it runs, else its body (polish spec 3 §4.3 item 3). A card with no text has no block. */
const commandBlocks = (card: TaskCard): HTMLDivElement[] => {
  if (card.isTurboTask) return blockOf('Command', card.command);

  if (card.runCommand !== null) return blockOf('Run command', card.runCommand);

  return blockOf('Script', card.command);
};

const descriptions = (card: TaskCard): HTMLParagraphElement[] => {
  const text = descriptionText(card.description);

  if (text === null) return [];

  const paragraph = textElement('p', 'card-description', text);
  const paragraphs = [paragraph];

  return paragraphs;
};

const plainClass = (isCode: boolean): string => {
  if (isCode) return 'code';

  return '';
};

const valueCell = (value: FieldValue): HTMLElement => {
  if (value.kind === 'empty') return textElement('dd', 'empty', value.text);

  if (value.kind === 'plain') return textElement('dd', plainClass(value.isCode), value.text);

  const cell = textElement('dd', '', '');
  const tokens = textElement('ul', 'tokens', '');

  for (const entry of value.entries) {
    const token = textElement('li', '', '');

    token.append(textElement('code', '', entry));
    tokens.append(token);
  }

  cell.append(tokens);

  return cell;
};

const fieldList = (card: TaskCard, phase: DryRunPhase): HTMLDListElement => {
  const list = document.createElement('dl');
  const kind = kindFacts(card, phase);
  const dependents = listValue(card.dependents, 'other');
  const rows: FieldRow[] = [...kind, ['Dependents', dependents]];

  list.className = 'fields';

  for (const [term, value] of rows) {
    list.append(textElement('dt', '', term), valueCell(value));
  }

  return list;
};

const taskGraphButtons = (card: TaskCard, context: RenderContext): HTMLButtonElement[] => {
  if (!context.hasTaskGraph) return [];

  const show = (): void => context.bridge.post({ type: 'showInTaskGraph', taskId: card.taskId });
  const button = iconButton('graph', `Show in task graph: ${card.name}`, show);

  context.focusTargets.set(`taskGraph:${card.taskId}`, button);

  return [button];
};

const cardActions = (card: TaskCard, refs: CardRefs, context: RenderContext): HTMLSpanElement => {
  const actions = textElement('span', 'card-actions', '');
  const copy = (): void => context.bridge.post({ type: 'copy', taskId: card.taskId });
  const copyButton = iconButton('copy', `Copy command for ${card.name}`, copy);
  const graphButtons = taskGraphButtons(card, context);

  context.focusTargets.set(`copy:${card.taskId}`, copyButton);
  actions.append(refs.runSlot, copyButton, ...graphButtons);

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
  const description = descriptions(card);
  const blocks = commandBlocks(card);
  const chips = chipList(card);
  const fields = fieldList(card, phase);
  const rendered: RenderedCard = { element, refs };

  fillRun(refs, card.run, context.runTexts);
  element.append(header, ...description, ...blocks, ...chips, fields);

  return rendered;
};
