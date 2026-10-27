import { iconButton } from './icon-button.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { DetailsBarElements } from '../common/details-view.type.ts';
import { CLEAR_LABEL, CLEAR_TITLE } from '../common/graph.const.ts';

/** The hidden Details bar: the selection summary, then the disabled icon-only Clear selection. */
export const buildDetailsBar = (): DetailsBarElements => {
  const bar = textElement('div', 'details-bar', '');
  const summary = textElement('p', 'details-summary', '');
  const clear = iconButton('clear-all', CLEAR_LABEL, CLEAR_TITLE);

  bar.hidden = true;
  clear.disabled = true;
  bar.append(summary, clear);

  const elements: DetailsBarElements = { bar, summary, clear };

  return elements;
};
