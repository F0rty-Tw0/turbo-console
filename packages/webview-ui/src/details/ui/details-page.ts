import { banners } from './banners.ts';
import { iconButton, textElement } from './page-elements.ts';
import { taskCard } from './task-card.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { DetailsState, MissingPackage, PackageDetails } from '../../bridge/common/details-state.type.ts';
import type { CardIndex, CardRefs } from '../common/details-page.type.ts';
import { MISSING_PACKAGE_TEXT } from '../common/field-text.const.ts';

const pageHeader = (state: PackageDetails, bridge: Bridge): HTMLElement => {
  const header = textElement('header', 'page-header', '');
  const title = textElement('h1', 'page-title', state.packageName);
  const refresh = iconButton('refresh', 'Refresh', (): void => bridge.post({ type: 'refresh', scope: 'dryRun' }));
  const open = iconButton('go-to-file', 'Open package.json', (): void => bridge.post({ type: 'openPackageJson' }));
  const actions = textElement('span', 'page-actions', '');
  const path = textElement('p', 'package-path', state.path);
  const tags = textElement('ul', 'tags', '');

  for (const tag of state.tags) tags.append(textElement('li', 'tag', tag));

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

const packagePage = (root: HTMLElement, state: PackageDetails, bridge: Bridge): CardIndex => {
  const cards = new Map<string, CardRefs>();
  const header = pageHeader(state, bridge);
  const bannerArea = textElement('div', 'banners', '');
  const cardList = textElement('div', 'cards', '');
  const shownBanners = banners(state, bridge);

  bannerArea.append(...shownBanners);

  for (const card of state.tasks) {
    const { element, refs } = taskCard(card, state.dryRun, bridge);

    cards.set(card.taskId, refs);
    cardList.append(element);
  }

  root.replaceChildren(header, bannerArea, cardList);

  return cards;
};

/** Replaces `root`'s content with the page for `state`; returns the cards `patchRun` updates. */
export const render = (root: HTMLElement, state: DetailsState, bridge: Bridge): CardIndex => {
  if (state.kind === 'package') return packagePage(root, state, bridge);

  missingPage(root, state);

  const noCards: CardIndex = new Map();

  return noCards;
};
