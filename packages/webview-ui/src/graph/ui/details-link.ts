import { explainView } from './details-explain.ts';
import { endsLeadOf, nameButton, viewBase } from './details-parts.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { LinkDetails } from '../common/details-view.type.ts';
import { LINK_HEADING_TEXT, LINK_LEAD_ID } from '../common/details.const.ts';
import type { ExplainState, LinkViewModel } from '../common/details.type.ts';

/**
 * One line, "[source] depends on [target]", with each end a name button and describing the heading, then the explain
 * slot, which starts out reading the dependent's manifest.
 */
export const linkView = (model: LinkViewModel, isOverlay: boolean): LinkDetails => {
  const base = viewBase('link', LINK_HEADING_TEXT, isOverlay);
  const source = nameButton(model.source);
  const target = nameButton(model.target);
  const lead = endsLeadOf(source, target, LINK_LEAD_ID, base.heading);
  const explain = textElement('section', 'details-section details-explain', '');
  const reading: ExplainState = { kind: 'reading', file: model.file };
  const readingView = explainView(reading);

  explain.setAttribute('aria-live', 'polite');
  explain.append(readingView.root);
  base.root.append(lead, explain);

  const view: LinkDetails = { ...base, kind: 'link', source, target, explain };

  return view;
};
