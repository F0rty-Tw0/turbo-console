import type { CardIndex, FocusTargets, RenderedPage } from './common/details-page.type.ts';
import { render } from './ui/details-page.ts';
import { focusedKey, refocus } from './ui/focus-targets.ts';
import { patchRun } from './ui/patch-run.ts';
import { holdPointerClicks, installRunClickHold } from './ui/run-click-hold.ts';
import { RunClock } from './ui/run-clock.ts';
import { isHostMessage } from './utils/host-message.util.ts';
import type { DetailsState } from '../bridge/common/details-state.type.ts';
import { createBridge } from '../bridge/data-access/create-bridge.ts';

const bridge = createBridge();
const clock = new RunClock();
const root = document.createElement('main');
const savedScrollY = bridge.scrollY();
const noCards: CardIndex = new Map();
const noTargets: FocusTargets = new Map();
let page: RenderedPage = { cards: noCards, focusTargets: noTargets };
let isScrollRestored = false;

// A loading page can be shorter than the saved position, so restoring then would clamp it.
const restoreScroll = (state: DetailsState): void => {
  const isLoading = state.kind === 'package' && state.dryRun === 'loading';

  if (isScrollRestored || isLoading) return;

  isScrollRestored = true;
  scrollTo(0, savedScrollY);
};

/**
 * A re-render of a page with cards holds pointer clicks: a card can leave (a kept script card that stopped while
 * scripts are hidden) and focus fall back to the title, so the page scrolls and another Run can land under the pointer.
 * The refocused replacement of a focused Run/Stop gets no full hold: a held Enter is the repeated-Enter filter's job,
 * and a fresh key press is aimed at the button that has focus.
 */
const showState = (state: DetailsState): void => {
  const focusKey = focusedKey(page.focusTargets);
  const hadCards = page.cards.size > 0;

  if (hadCards) holdPointerClicks();

  page = render(root, state, bridge, clock);
  refocus(page.focusTargets, focusKey);
  restoreScroll(state);
};

const receive = (message: unknown): void => {
  if (!isHostMessage(message)) return;

  switch (message.type) {
    case 'state':
      showState(message.state);
      break;
    case 'runState':
      patchRun(page.cards, message.taskId, message.run, clock);
      break;
  }
};

// Until the restore, a scroll event only reports a clamp of a short page; saving it would lose the position.
const saveScroll = (): void => {
  if (!isScrollRestored) return;

  bridge.saveScroll(scrollY);
};

// A held Enter repeats its click; a repeat must never hit a Run/Stop button swapped in under it.
const ignoreRepeatedEnter = (event: KeyboardEvent): void => {
  if (event.repeat && event.key === 'Enter') event.preventDefault();
};

document.body.append(root);
addEventListener('keydown', ignoreRepeatedEnter, true);
installRunClickHold();
addEventListener('scroll', saveScroll, { passive: true });
bridge.onMessage(receive);
bridge.ready();
