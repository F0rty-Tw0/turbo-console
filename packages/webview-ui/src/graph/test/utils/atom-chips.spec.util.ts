import type { GraphAtomCounts } from '../../../bridge/common/graph-atoms-message.type.ts';
import { atomCountsText } from '../../../bridge/utils/atom-counts-text.util.ts';

const isHtmlElement = (element: Element): element is HTMLElement => 'dataset' in element;

/** A chip row built in the stubbed `document`: a `div.atom-chips` whose text is the counts text. */
export const textRowOf = (counts: GraphAtomCounts): HTMLElement => {
  const row = document.createElement('div');

  row.className = 'atom-chips';
  row.textContent = atomCountsText(counts);

  return row;
};

/** The chip rows in `layer`, in order. */
export const layerRowsOf = (layer: HTMLElement): HTMLElement[] => {
  const children = Array.from(layer.children);

  return children.filter(isHtmlElement);
};

/** The `index`th chip row in `layer`; a missing one fails the spec. */
export const layerRowAt = (layer: HTMLElement, index: number): HTMLElement => {
  const row = layerRowsOf(layer)[index];

  if (row === undefined) throw new Error(`the layer has no row ${String(index)}`);

  return row;
};
