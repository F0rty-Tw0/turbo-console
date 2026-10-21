import { banners } from './banners.ts';
import { iconButton, textElement } from './page-elements.ts';
import { taskCard } from './task-card.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { DetailsState, MissingPackage, PackageDetails } from '../../bridge/common/details-state.type.ts';
import type { CardIndex, CardRefs, FocusTargets, RenderContext, RenderedPage, RunTexts } from '../common/details-page.type.ts';
import { MISSING_PACKAGE_TEXT, SCRIPTS_TITLE, TURBO_TASKS_TITLE } from '../common/field-text.const.ts';
import { noCardsText } from '../utils/field-text.util.ts';

/** The page title takes focus only from `refocus`, when the focused control is gone after a re-render. */
const pageTitle = (packageName: string, focusTargets: FocusTargets): HTMLElement => {
  const title = textElement('h1', 'page-title', packageName);

  title.tabIndex = -1;
  focusTargets.set('title', title);

  return title;
};

const pageHeader = (state: PackageDetails, context: RenderContext): HTMLElement => {
  const { bridge, focusTargets } = context;
  const header = textElement('header', 'page-header', '');
  const title = pageTitle(state.label, focusTargets);
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

const missingPage = (root: HTMLElement, state: MissingPackage, focusTargets: FocusTargets): void => {
  const header = textElement('header', 'page-header', '');
  const title = pageTitle(state.label ?? state.packageName, focusTargets);
  const notice = textElement('p', 'missing', MISSING_PACKAGE_TEXT);

  header.append(title);
  root.replaceChildren(header, notice);
};

/** A titled section of one kind's cards with their count; a kind with no card has no section (spec 1c-b §4.10). */
const cardSection = (title: string, cardElements: HTMLElement[]): HTMLElement[] => {
  if (cardElements.length === 0) return [];

  const section = textElement('section', 'card-section', '');
  const heading = textElement('h2', 'section-title', `${title} `);
  const count = textElement('span', 'section-count', `(${cardElements.length})`);
  const cardList = textElement('div', 'cards', '');
  const sections = [section];

  heading.append(count);
  cardList.append(...cardElements);
  section.append(heading, cardList);

  return sections;
};

/** Turbo task cards, then script cards, each under its section; a package with no card says why in their place. */
const cardSections = (state: PackageDetails, context: RenderContext, cards: Map<string, CardRefs>): HTMLElement => {
  const body = textElement('div', 'card-sections', '');
  const turboCards: HTMLElement[] = [];
  const scriptCards: HTMLElement[] = [];

  for (const card of state.tasks) {
    const { element, refs } = taskCard(card, state.dryRun, context);
    const kindCards = card.isTurboTask ? turboCards : scriptCards;

    cards.set(card.taskId, refs);
    kindCards.push(element);
  }

  const turboSection = cardSection(TURBO_TASKS_TITLE, turboCards);
  const scriptSection = cardSection(SCRIPTS_TITLE, scriptCards);
  const emptyText = noCardsText(state);

  if (state.tasks.length === 0) body.append(textElement('p', 'no-tasks', emptyText));

  body.append(...turboSection, ...scriptSection);

  return body;
};

const packagePage = (root: HTMLElement, state: PackageDetails, context: RenderContext): CardIndex => {
  const cards = new Map<string, CardRefs>();
  const header = pageHeader(state, context);
  const bannerArea = textElement('div', 'banners', '');
  const shownBanners = banners(state, context);
  const body = cardSections(state, context, cards);

  bannerArea.append(...shownBanners);
  root.replaceChildren(header, bannerArea, body);

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

  missingPage(root, state, focusTargets);

  const noCards: CardIndex = new Map();
  const missing: RenderedPage = { cards: noCards, focusTargets };

  return missing;
};
