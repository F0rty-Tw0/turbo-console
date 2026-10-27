import { textElement } from '../../shared/ui/text-element.ts';
import type { DetailsElements } from '../common/details-view.type.ts';
import { DETAILS_ID, DETAILS_LABEL } from '../common/graph.const.ts';

/** The `div.details-content` of a Details aside: it holds the shown view and lays its parts out as the aside's own. */
export const buildDetailsContent = (): HTMLElement => textElement('div', 'details-content', '');

/** The details panel and its empty content; `GraphDetails` fills the content with one view at a time. */
export const buildDetails = (): DetailsElements => {
  const panel = textElement('aside', 'graph-details', '');
  const content = buildDetailsContent();

  panel.id = DETAILS_ID;
  panel.setAttribute('aria-label', DETAILS_LABEL);
  panel.append(content);

  const elements: DetailsElements = { panel, content };

  return elements;
};
