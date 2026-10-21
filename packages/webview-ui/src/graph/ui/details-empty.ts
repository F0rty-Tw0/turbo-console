/* eslint-disable local/no-unused-exports -- first imported by Task 3.4 */
import { keyedLine, leadOf, viewBase } from './details-parts.ts';
import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { EmptyDetails } from '../common/details-view.type.ts';
import { EMPTY_FOOTER_TEXT, EMPTY_GUIDE, EMPTY_LEAD_TEXT } from '../common/details.const.ts';
import type { GuideItem } from '../common/details.type.ts';
import { DETAILS_LABEL } from '../common/graph.const.ts';

const guideItem = (item: GuideItem): HTMLLIElement => {
  const li = textElement('li', '', '');
  const icon = graphIcon(item.icon);
  const name = textElement('strong', '', item.name);
  const text = keyedLine(item.text, 'details-muted');

  li.append(icon, name, text);

  return li;
};

/** What the panel shows with nothing selected: what can be, how, and how to clear it. */
export const emptyView = (isOverlay: boolean): EmptyDetails => {
  const base = viewBase('empty', DETAILS_LABEL, isOverlay);
  const lead = leadOf(EMPTY_LEAD_TEXT);
  const guide = textElement('ul', 'details-guide', '');
  const items = EMPTY_GUIDE.map(guideItem);
  const footer = keyedLine(EMPTY_FOOTER_TEXT, 'details-footer');

  guide.append(...items);
  base.root.append(lead, guide, footer);

  const view: EmptyDetails = { ...base, kind: 'empty' };

  return view;
};
