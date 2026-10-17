import { codicon, textElement } from './page-elements.ts';
import type { RunView } from '../../bridge/common/details-state.type.ts';
import type { CardIndex, CardRefs, RunTexts } from '../common/details-page.type.ts';
import { STOP_ICON_ID, STOP_TO_RUN_HOLD_MS } from '../common/run-view.const.ts';
import { safeColorVar } from '../utils/run-view.util.ts';

const STOP_ICON = `.codicon-${STOP_ICON_ID}`;

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

/**
 * Ignores clicks on `button` for `STOP_TO_RUN_HOLD_MS`. A click capture listener on the target runs before its own click
 * listener, and Enter or Space on a button arrives as a click, so a click meant for Stop that lands on Run is dropped.
 */
const holdClicks = (button: HTMLButtonElement): void => {
  const ignore = (event: Event): void => event.stopImmediatePropagation();
  const release = (): void => button.removeEventListener('click', ignore, true);

  button.addEventListener('click', ignore, true);
  setTimeout(release, STOP_TO_RUN_HOLD_MS);
};

/**
 * Replaces only `taskId`'s status and Run/Stop button. A Run button that replaces Stop ignores clicks for
 * `STOP_TO_RUN_HOLD_MS`, focused or not: VS Code can move focus off the page when a run stops, and a double-click's
 * second click comes long after a frame. A focused Run/Stop button hands focus to its replacement. A held Enter is the
 * page's repeated-Enter keydown filter's job, since its repeats outlast the hold.
 */
export const patchRun = (cards: CardIndex, taskId: string, run: RunView, runTexts: RunTexts): void => {
  const refs = cards.get(taskId);

  if (refs === undefined) return;

  const hadFocus = refs.runSlot.contains(document.activeElement);
  const hadStop = refs.runSlot.querySelector(STOP_ICON) !== null;
  const button = fillRun(refs, run, runTexts);
  const isStopToRun = hadStop && !run.isRunning;

  if (isStopToRun) holdClicks(button);

  if (hadFocus) button.focus();
};
