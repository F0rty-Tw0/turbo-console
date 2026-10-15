import type { TaskDefinition } from '@turbo-console/core';

import { iconButton, textElement } from './page-elements.ts';
import { fillRun } from './patch-run.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { DryRunPhase, RunView, TaskCard } from '../../bridge/common/details-state.type.ts';
import type { CardRefs, FieldRow, RenderedCard, RunButtonFactory } from '../common/details-page.type.ts';
import { NONE_TEXT, UNAVAILABLE_TEXT } from '../common/field-text.const.ts';
import { cacheText, definitionText, listText } from '../utils/field-text.util.ts';

const runButtonFor = (card: TaskCard, bridge: Bridge): RunButtonFactory => {
  const { name, taskId } = card;
  const stop = (): void => bridge.post({ type: 'stop', taskId });
  const run = (): void => bridge.post({ type: 'run', taskId });

  return (view: RunView): HTMLButtonElement => {
    if (view.isRunning) return iconButton('debug-stop', `Stop ${name}`, stop);

    return iconButton('play', `Run ${name}`, run);
  };
};

const definitionRows = (card: TaskCard, phase: DryRunPhase): FieldRow[] => {
  const { definition } = card;

  if (definition === null) {
    const pending = definitionText(card, phase) ?? UNAVAILABLE_TEXT;
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

const badges = (definition: TaskDefinition | null): HTMLUListElement => {
  const list = textElement('ul', 'badges', '');

  if (definition?.cache === true) list.append(textElement('li', 'badge', 'Cacheable'));

  if (definition?.persistent === true) list.append(textElement('li', 'badge', 'Continuous'));

  return list;
};

const cardHeader = (card: TaskCard, refs: CardRefs, bridge: Bridge): HTMLElement => {
  const header = document.createElement('header');
  const copy = (): void => bridge.post({ type: 'copy', taskId: card.taskId });
  const copyButton = iconButton('copy', `Copy command for ${card.name}`, copy);
  const actions = textElement('span', 'card-actions', '');
  const title = textElement('h2', 'card-title', card.name);

  header.className = 'card-header';
  actions.append(refs.runSlot, copyButton);
  header.append(title, refs.status, actions);

  return header;
};

/** One task card; repo text goes in through `textContent` and `aria-label`/`title` only. */
export const taskCard = (card: TaskCard, phase: DryRunPhase, bridge: Bridge): RenderedCard => {
  const element = textElement('section', 'card', '');
  const status = textElement('span', 'run-status', '');
  const runSlot = textElement('span', 'run-slot', '');
  const runButton = runButtonFor(card, bridge);
  const refs: CardRefs = { status, runSlot, runButton };
  const header = cardHeader(card, refs, bridge);
  const fields = fieldList(card, phase);
  const badgeList = badges(card.definition);
  const rendered: RenderedCard = { element, refs };

  fillRun(refs, card.run);
  element.append(header, badgeList, fields);

  return rendered;
};
