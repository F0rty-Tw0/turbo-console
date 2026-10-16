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

const blankRun = (refs: CardRefs, runTexts: RunTexts): null => {
  runTexts.drop(refs.taskId);
  refs.status.replaceChildren();
  refs.runSlot.replaceChildren();

  return null;
};

const fillStatus = (refs: CardRefs, run: RunView, runTexts: RunTexts): void => {
  const icon = statusIcon(run);
  const text = textElement('span', 'run-text', '');

  runTexts.show(refs.taskId, text, run);
  refs.status.replaceChildren(icon, text);
};

/** A card that is no turbo task offers Stop while it runs, never Run (spec 1c-a §4.12). */
const fillButton = (refs: CardRefs, run: RunView): HTMLButtonElement | null => {
  const hasButton = refs.isTurboTask || run.isRunning;

  if (!hasButton) {
    refs.runSlot.replaceChildren();

    return null;
  }

  const button = refs.runButton(run);

  refs.runSlot.replaceChildren(button);

  return button;
};

/**
 * Writes a run's status and Run/Stop button into a card; returns the new button, or `null` when the card has none. A
 * card that is no turbo task gets a blank status while idle and keeps an ended run's status (spec 1c-a §4.5).
 */
export const fillRun = (refs: CardRefs, run: RunView, runTexts: RunTexts): HTMLButtonElement | null => {
  const isIdleScript = !refs.isTurboTask && run.isIdle;

  if (isIdleScript) return blankRun(refs, runTexts);

  fillStatus(refs, run, runTexts);

  return fillButton(refs, run);
};

/**
 * Replaces only `taskId`'s status and Run/Stop button; a focused Run/Stop button hands focus to its replacement, or to
 * the card title when there is none.
 */
export const patchRun = (cards: CardIndex, taskId: string, run: RunView, runTexts: RunTexts): void => {
  const refs = cards.get(taskId);

  if (refs === undefined) return;

  const hadFocus = refs.runSlot.contains(document.activeElement);
  const button = fillRun(refs, run, runTexts);
  const focusTarget = button ?? refs.title;

  if (hadFocus) focusTarget.focus();
};
