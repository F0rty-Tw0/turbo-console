import { banners } from './banners.ts';
import { iconButton, textElement } from './page-elements.ts';
import { taskCard } from './task-card.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { DetailsState, MissingPackage, PackageDetails } from '../../bridge/common/details-state.type.ts';
import type { CardIndex, CardRefs, FocusTargets, RenderContext, RenderedPage, RunTexts } from '../common/details-page.type.ts';
import { MISSING_PACKAGE_TEXT, NO_TASK_CARDS_TEXT } from '../common/field-text.const.ts';

const pageHeader = (state: PackageDetails, context: RenderContext): HTMLElement => {
  const { bridge, focusTargets } = context;
  const header = textElement('header', 'page-header', '');
  const title = textElement('h1', 'page-title', state.packageName);
  const refresh = iconButton('refresh', 'Refresh', (): void => bridge.post({ type: 'refresh', scope: 'dryRun' }));
  const open = iconButton('go-to-file', 'Open package.json', (): void => bridge.post({ type: 'openPackageJson' }));
  const actions = textElement('span', 'page-actions', '');
  const path = textElement('p', 'package-path', state.path);
  const tags = textElement('ul', 'tags', '');

  for (const tag of state.tags) tags.append(textElement('li', 'tag', tag));

  focusTargets.set('refresh', refresh);
  focusTargets.set('open', open);
  actions.append(refresh, open);
  header.append(title, actions, path, tags);

  return header;
};

const missingPage = (root: HTMLElement, state: MissingPackage): void => {
  const header = textElement('header', 'page-header', '');
  const title = textElement('h1', 'page-title', state.packageName);
  const notice = textElement('p', 'missing', MISSING_PACKAGE_TEXT);

  header.append(title);
  root.replaceChildren(header, notice);
};

const packagePage = (root: HTMLElement, state: PackageDetails, context: RenderContext): CardIndex => {
  const cards = new Map<string, CardRefs>();
  const header = pageHeader(state, context);
  const bannerArea = textElement('div', 'banners', '');
  const cardList = textElement('div', 'cards', '');
  const shownBanners = banners(state, context);

  bannerArea.append(...shownBanners);

  if (state.tasks.length === 0) cardList.append(textElement('p', 'no-tasks', NO_TASK_CARDS_TEXT));

  for (const card of state.tasks) {
    const { element, refs } = taskCard(card, state.dryRun, context);

    cards.set(card.taskId, refs);
    cardList.append(element);
  }

  root.replaceChildren(header, bannerArea, cardList);

  return cards;
};

/**
 * Replaces `root`'s content with the page for `state`; returns the cards `patchRun` updates and the focus targets.
 * `runTexts` forgets the replaced cards and ticks the new running ones.
 */
export const render = (root: HTMLElement, state: DetailsState, bridge: Bridge, runTexts: RunTexts): RenderedPage => {
  const focusTargets: FocusTargets = new Map();
  const context: RenderContext = { bridge, focusTargets, runTexts };

  runTexts.reset();

  if (state.kind === 'package') {
    const cards = packagePage(root, state, context);
    const page: RenderedPage = { cards, focusTargets };

    return page;
  }

  missingPage(root, state);

  const noCards: CardIndex = new Map();
  const missing: RenderedPage = { cards: noCards, focusTargets };

  return missing;
};
