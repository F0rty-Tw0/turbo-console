import type { CardIndex } from './common/details-page.type.ts';
import { render } from './ui/details-page.ts';
import { patchRun } from './ui/patch-run.ts';
import { isHostMessage } from './utils/host-message.util.ts';
import type { DetailsState } from '../bridge/common/details-state.type.ts';
import { createBridge } from '../bridge/data-access/create-bridge.ts';

const bridge = createBridge();
const root = document.createElement('main');
let cards: CardIndex = new Map();
let isScrollRestored = false;

const showState = (state: DetailsState): void => {
  cards = render(root, state, bridge);

  if (isScrollRestored) return;

  isScrollRestored = true;
  scrollTo(0, bridge.scrollY());
};

const receive = (message: unknown): void => {
  if (!isHostMessage(message)) return;

  switch (message.type) {
    case 'state':
      showState(message.state);
      break;
    case 'runState':
      patchRun(cards, message.taskId, message.run);
      break;
  }
};

const saveScroll = (): void => bridge.saveScroll(scrollY);

document.body.append(root);
addEventListener('scroll', saveScroll, { passive: true });
bridge.onMessage(receive);
bridge.ready();
