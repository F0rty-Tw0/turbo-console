import { codicon } from './page-elements.ts';
import { holdSwappedButton } from './run-click-hold.ts';
import type { RunView } from '../../bridge/common/details-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { CardIndex, CardRefs, RunTexts } from '../common/details-page.type.ts';
import { RUNNING_STATUS_COLOR_VAR, STOP_ICON_ID } from '../common/run-view.const.ts';
import { safeColorVar } from '../utils/run-view.util.ts';

const STOP_ICON = `.codicon-${STOP_ICON_ID}`;

const statusIcon = (run: RunView, colorVar: string | null): HTMLSpanElement => {
  const icon = codicon(run.iconId);

  if (run.isSpinning) icon.classList.add('codicon-modifier-spin');

  if (colorVar !== null) icon.style.setProperty('color', `var(${colorVar})`);

  return icon;
};

const fillStatusColor = (refs: CardRefs, colorVar: string | null): void => {
  if (colorVar === null) {
    refs.card.style.removeProperty('--status-color');

    return;
  }

  refs.card.style.setProperty('--status-color', `var(${colorVar})`);
};

/** Every card's status stays blank until it has a run to show (spec 1c-b §4.5, polish spec 3 §4.4). */
const fillStatus = (refs: CardRefs, run: RunView, runTexts: RunTexts): void => {
  const ownColorVar = safeColorVar(run.colorVar);
  const liveColorVar = run.isRunning ? RUNNING_STATUS_COLOR_VAR : ownColorVar;
  const cardColorVar = run.isIdle ? null : liveColorVar;

  fillStatusColor(refs, cardColorVar);

  if (run.isIdle) {
    runTexts.drop(refs.taskId);
    refs.status.replaceChildren();

    return;
  }

  const icon = statusIcon(run, ownColorVar);
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

/** Writes the run and its new button, holds its clicks, and hands focus over when the old button had it. */
const swapRun = (refs: CardRefs, run: RunView, runTexts: RunTexts): void => {
  const hadFocus = refs.runSlot.contains(document.activeElement);
  const button = fillRun(refs, run, runTexts);

  holdSwappedButton(button);

  if (hadFocus) button.focus();
};

/**
 * Replaces only `taskId`'s status, and its Run/Stop button only when the run starts or ends. A Run that replaces Stop,
 * or a Stop that replaces Run, ignores every click for `RUN_SWAP_HOLD_MS`, focused or not: VS Code can move focus off
 * the page when a run stops, and a double-click's second click comes long after a frame, so it would relaunch a stopped
 * run or stop a fresh one. Every other Run/Stop button stays live (see `holdSwappedButton`). A focused Run/Stop button
 * hands focus to its replacement. Any other runState, such as the host's second running one for the same Run or a
 * running tick, keeps the button, its hold and its focus, since the button depends only on whether the run is live. A
 * held Enter is the page's repeated-Enter keydown filter's job, since its repeats outlast the hold.
 */
export const patchRun = (cards: CardIndex, taskId: string, run: RunView, runTexts: RunTexts): void => {
  const refs = cards.get(taskId);

  if (refs === undefined) return;

  const hadStop = refs.runSlot.querySelector(STOP_ICON) !== null;
  const isSwap = hadStop !== run.isRunning;

  if (isSwap) swapRun(refs, run, runTexts);
  else fillStatus(refs, run, runTexts);
};
