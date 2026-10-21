import { explainView } from './details-explain.ts';
import { leadOf, nameButton, viewBase } from './details-parts.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { LinkDetails } from '../common/details-view.type.ts';
import type { ExplainState, LinkViewModel } from '../common/details.type.ts';
import { dependsTextOf, linkTitleOf } from '../utils/details-text.util.ts';

/** A link's ends and the explain slot, which starts out reading the dependent's manifest. */
export const linkView = (model: LinkViewModel, isOverlay: boolean): LinkDetails => {
  const title = linkTitleOf(model.source, model.target);
  const base = viewBase('link', title, isOverlay);
  const leadText = dependsTextOf(model.source, model.target);
  const lead = leadOf(leadText);
  const ends = textElement('div', 'details-ends', '');
  const source = nameButton(model.source);
  const target = nameButton(model.target);
  const explain = textElement('section', 'details-section details-explain', '');
  const reading: ExplainState = { kind: 'reading', file: model.file };
  const readingView = explainView(reading);

  explain.setAttribute('aria-live', 'polite');
  explain.append(readingView.root);
  ends.append(source, target);
  base.root.append(lead, ends, explain);

  const view: LinkDetails = { ...base, kind: 'link', source, target, explain };

  return view;
};
