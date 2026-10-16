import { codicon, textElement } from './page-elements.ts';
import type { RunView } from '../../bridge/common/details-state.type.ts';
import type { CardIndex, CardRefs, RunTexts } from '../common/details-page.type.ts';
import { safeColorVar } from '../utils/run-view.util.ts';

const statusIcon = (run: RunView): HTMLSpanElement => {
  const icon = codicon(run.iconId);
  const colorVar = safeColorVar(run.colorVar);

  if (run.isSpinning) icon.classList.add('codicon-modifier-spin');

  if (colorVar !== null) icon.style.setProperty('color', `var(${colorVar})`);

  return icon;
};

/** Writes a run's status and Run/Stop button into a card; returns the new button. */
export const fillRun = (refs: CardRefs, run: RunView, runTexts: RunTexts): HTMLButtonElement => {
  const icon = statusIcon(run);
  const text = textElement('span', 'run-text', '');
  const button = refs.runButton(run);

  runTexts.show(refs.taskId, text, run);
  refs.status.replaceChildren(icon, text);
  refs.runSlot.replaceChildren(button);

  return button;
};

/** Replaces only `taskId`'s status and Run/Stop button; a focused Run/Stop button hands focus to its replacement. */
export const patchRun = (cards: CardIndex, taskId: string, run: RunView, runTexts: RunTexts): void => {
  const refs = cards.get(taskId);

  if (refs === undefined) return;

  const hadFocus = refs.runSlot.contains(document.activeElement);
  const button = fillRun(refs, run, runTexts);

  if (hadFocus) button.focus();
};
