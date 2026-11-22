import { checkField, checkbox } from './controls-fields.ts';
import { textButton } from './icon-button.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import {
  MODULES_BACK_LABEL,
  MODULES_BAR_ID,
  MODULES_REFRESH_LABEL,
  MODULES_RESET_LABEL,
  MODULES_RETRY_LABEL,
  MODULES_VIEW_LABEL,
  MODULE_LAZIES_LABEL,
  MODULE_SLOW_TEXT,
  MODULE_TESTS_LABEL,
  MODULE_TYPES_LABEL
} from '../common/graph-module.const.ts';
import type { ModulesBarElements } from '../common/modules-bar.type.ts';

/** A View checkbox, checked: every kind shows until the saved view says otherwise. */
const checkedBox = (): HTMLInputElement => {
  const check = checkbox('controls-check');

  check.checked = true;

  return check;
};

/** The View group: the three kind toggles, then Reset view. */
const viewGroup = (types: HTMLInputElement, tests: HTMLInputElement, lazies: HTMLInputElement, reset: HTMLButtonElement): HTMLElement => {
  const group = textElement('div', 'modules-bar-view', '');
  const typesField = checkField(MODULE_TYPES_LABEL, types);
  const testsField = checkField(MODULE_TESTS_LABEL, tests);
  const laziesField = checkField(MODULE_LAZIES_LABEL, lazies);

  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', MODULES_VIEW_LABEL);
  group.append(typesField, testsField, laziesField, reset);

  return group;
};

/** The hidden banner: its status text, then Retry, hidden too until a scan fails. */
const bannerBlock = (bannerText: HTMLElement, retry: HTMLButtonElement): HTMLElement => {
  const banner = textElement('div', 'graph-notice modules-bar-banner', '');

  bannerText.setAttribute('role', 'status');
  retry.hidden = true;
  banner.hidden = true;
  banner.append(bannerText, retry);

  return banner;
};

/**
 * The modules bar: Back, the title, Refresh and the counts line, then the View group, the banner and the slow notice.
 * The texts are empty until the screen writes them; DOM order is the Tab order.
 */
export const buildModulesBar = (): ModulesBarElements => {
  const bar = textElement('div', 'graph-modules-bar', '');
  const back = textButton(MODULES_BACK_LABEL);
  const title = textElement('h2', 'modules-bar-title', '');
  const refresh = textButton(MODULES_REFRESH_LABEL);
  const status = textElement('p', 'modules-bar-status', '');
  const types = checkedBox();
  const tests = checkedBox();
  const lazies = checkedBox();
  const reset = textButton(MODULES_RESET_LABEL);
  const view = viewGroup(types, tests, lazies, reset);
  const bannerText = textElement('p', 'modules-bar-banner-text', '');
  const retry = textButton(MODULES_RETRY_LABEL);
  const banner = bannerBlock(bannerText, retry);
  const slow = textElement('p', 'modules-bar-slow', MODULE_SLOW_TEXT);

  bar.id = MODULES_BAR_ID;
  slow.hidden = true;
  bar.append(back, title, refresh, status, view, banner, slow);

  const elements: ModulesBarElements = { bar, back, title, refresh, status, banner, bannerText, retry, slow, types, tests, lazies, reset };

  return elements;
};
