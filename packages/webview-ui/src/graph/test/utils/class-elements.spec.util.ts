import type { ImportsDetails } from '../../common/details-view.type.ts';

/** `element`, then every element under it, depth first. */
export const selfAndBelowOf = (element: Element): Element[] => {
  const children = Array.from(element.children);
  const below = children.flatMap(selfAndBelowOf);

  return [element, ...below];
};

export const textOf = (element: Element): string | null => element.textContent;

/** Every element in `root` or under it that carries `className`, in document order. */
export const withClass = (root: Element, className: string): Element[] => {
  const all = selfAndBelowOf(root);

  return all.filter((element) => element.classList.contains(className));
};

/** Every `inner` element under an `outer` element of `root`, in document order. */
export const withClassIn = (root: Element, outer: string, inner: string): Element[] => {
  const outers = withClass(root, outer);

  return outers.flatMap((element) => withClass(element, inner));
};

/** The direct children of every `className` element of `root`, in document order. */
export const childrenOf = (root: Element, className: string): Element[] => {
  const holders = withClass(root, className);

  return holders.flatMap((holder) => Array.from(holder.children));
};

/** The text of every `className` element of `root`, in document order. */
export const textsWith = (root: Element, className: string): (string | null)[] => withClass(root, className).map(textOf);

/** For each import row of `view`, the text of every `className` element inside its button. */
export const rowTextsWith = (view: ImportsDetails, className: string): (string | null)[][] => {
  return view.rows.map((row) => textsWith(row.button, className));
};
