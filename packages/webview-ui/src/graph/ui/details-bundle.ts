import { dependsOnOf, endsLeadOf, explainButton, nameButton, viewBase } from './details-parts.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { BundleDetails } from '../common/details-view.type.ts';
import { BUNDLE_HEADING_TEXT, BUNDLE_LEAD_ID } from '../common/details.const.ts';
import type { BundleEndModel, BundleViewModel } from '../common/details.type.ts';
import { explainLabelOf } from '../utils/details-text.util.ts';

/**
 * An end's name button; a folder end is named as a folder and carries no `data-name`, since a package can share its
 * title and `data-name` means "this is package X".
 */
const endButton = (end: BundleEndModel): HTMLButtonElement => {
  const button = nameButton(end.text);

  if (end.folder === null) return button;

  const label = `Folder ${end.text}`;

  delete button.dataset['name'];
  button.setAttribute('aria-label', label);
  button.title = label;

  return button;
};

type BundleLinkItem = BundleDetails['links'][number];

/** Appends a package link's row to `list`: its two names, then Explain. */
const linkItem = (list: HTMLUListElement, edge: GraphEdge): BundleLinkItem => {
  const li = textElement('li', 'details-item', '');
  const text = textElement('span', 'details-link-text', '');
  const pickSource = nameButton(edge.source);
  const pickTarget = nameButton(edge.target);
  const explainLabel = explainLabelOf(edge.source, edge.target);
  const explain = explainButton(explainLabel);

  text.append(pickSource, dependsOnOf(), pickTarget);
  li.append(text, explain);
  list.append(li);

  const item: BundleLinkItem = { source: edge.source, target: edge.target, pickSource, pickTarget, explain };

  return item;
};

/**
 * A bundled folder link: its ends and link count, then one "[source] depends on [target]" row with Explain per package
 * link; a collapsed end is its folder's title.
 */
export const bundleView = (model: BundleViewModel, isOverlay: boolean): BundleDetails => {
  const base = viewBase('bundle', BUNDLE_HEADING_TEXT, isOverlay);
  const source = endButton(model.source);
  const target = endButton(model.target);
  const lead = endsLeadOf(source, target, BUNDLE_LEAD_ID, base.heading);
  const count = textElement('p', 'details-muted', model.countText);
  const list = textElement('ul', 'details-list', '');
  const itemOf = (edge: GraphEdge): BundleLinkItem => linkItem(list, edge);
  const links = model.links.map(itemOf);

  base.root.append(lead, count, list);

  const view: BundleDetails = { ...base, kind: 'bundle', source, target, count, links };

  return view;
};
