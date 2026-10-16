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

/** A script card's status stays blank until it has a run to show (spec 1c-b §4.5). */
const fillStatus = (refs: CardRefs, run: RunView, runTexts: RunTexts): void => {
  const isIdleScript = !refs.isTurboTask && run.isIdle;

  if (isIdleScript) {
    runTexts.drop(refs.taskId);
    refs.status.replaceChildren();

    return;
  }

  const icon = statusIcon(run);
  const text = textElement('span', 'run-text', '');

  runTexts.show(refs.taskId, text, run);
  refs.status.replaceChildren(icon, text);
};

/**
 * Writes a run's status and Run/Stop button into a card and returns the new button: Stop while the run is live, else
 * Run, for turbo and script cards alike (spec 1c-b §4.10).
 */
export const fillRun = (refs: CardRefs, run: RunView, runTexts: RunTexts): HTMLButtonElement => {
  const button = refs.runButton(run);

  fillStatus(refs, run, runTexts);
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
