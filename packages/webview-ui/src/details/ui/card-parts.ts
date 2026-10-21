import { codicon, textElement } from './page-elements.ts';
import type { TaskCard, ToolView } from '../../bridge/common/details-state.type.ts';
import { CONTINUOUS_CHIP_TEXT, NOT_CACHEABLE_CHIP_TEXT } from '../common/field-text.const.ts';
import { safeToolIconId } from '../utils/run-view.util.ts';

/** A labelled block holding `text` in one `pre`; the group role is what gives the label an accessible name. */
export const commandBlock = (label: string, text: string): HTMLDivElement => {
  const block = textElement('div', 'command', '');
  const code = textElement('pre', '', text);

  block.setAttribute('role', 'group');
  block.setAttribute('aria-label', label);
  block.append(code);

  return block;
};

/** Spec 1c-c §4.6: the logo only when the host's icon id is one of the tool icon font's (two nodes), else the name alone (one text node). */
const toolChip = (tool: ToolView): HTMLLIElement => {
  const iconId = safeToolIconId(tool.iconId);

  if (iconId === null) return textElement('li', 'chip chip-tool', tool.title);

  const chip = textElement('li', 'chip chip-tool chip-icon', '');

  chip.append(codicon(iconId), textElement('span', '', tool.title));

  return chip;
};

const isContinuous = (card: TaskCard): boolean => card.persistent || card.definition?.persistent === true;

const isUncacheable = (card: TaskCard): boolean => card.definition?.cache === false;

const chipsOf = (card: TaskCard): HTMLLIElement[] => {
  const chips: HTMLLIElement[] = [];

  if (card.tool !== null) chips.push(toolChip(card.tool));

  const continuous = isContinuous(card);
  const uncacheable = isUncacheable(card);

  if (continuous) chips.push(textElement('li', 'chip', CONTINUOUS_CHIP_TEXT));

  if (uncacheable) chips.push(textElement('li', 'chip', NOT_CACHEABLE_CHIP_TEXT));

  return chips;
};

/** The chip row (Tool, Continuous, Not cacheable); a card with no chip has no row. */
export const chipList = (card: TaskCard): HTMLUListElement[] => {
  const chips = chipsOf(card);

  if (chips.length === 0) return [];

  const list = textElement('ul', 'chips', '');

  list.append(...chips);

  return [list];
};
