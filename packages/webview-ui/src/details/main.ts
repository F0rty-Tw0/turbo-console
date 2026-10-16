import type { CardIndex, FocusTargets, RenderedPage } from './common/details-page.type.ts';
import { render } from './ui/details-page.ts';
import { focusedKey, refocus } from './ui/focus-targets.ts';
import { patchRun } from './ui/patch-run.ts';
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

const showState = (state: DetailsState): void => {
  const focusKey = focusedKey(page.focusTargets);

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

document.body.append(root);
addEventListener('scroll', saveScroll, { passive: true });
bridge.onMessage(receive);
bridge.ready();
