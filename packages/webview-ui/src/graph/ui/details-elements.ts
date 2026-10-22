import { textElement } from '../../shared/ui/text-element.ts';
import type { DetailsElements } from '../common/details-view.type.ts';
import { DETAILS_LABEL } from '../common/graph.const.ts';

/** The empty details panel; `GraphDetails` fills it with one view at a time. */
export const buildDetails = (): DetailsElements => {
  const panel = textElement('aside', 'graph-details', '');

  panel.id = 'graph-details';
  panel.setAttribute('aria-label', DETAILS_LABEL);

  const elements: DetailsElements = { panel };

  return elements;
};
