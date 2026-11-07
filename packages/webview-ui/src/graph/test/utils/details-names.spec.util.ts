import { selfAndBelowOf, textOf } from './class-elements.spec.util.ts';

const isNameButton = (element: Element): boolean => element.classList.contains('details-name');

/** The text of every package name button in `root` or under it, in document order. */
export const namesIn = (root: Element): (string | null)[] => {
  const names = selfAndBelowOf(root).filter(isNameButton);

  return names.map(textOf);
};

const isHtmlElement = (element: Element): element is HTMLElement => 'dataset' in element;

/** Every element in `root` or under it whose `data-action` is `action`, in document order. */
export const actionElementsIn = (root: Element, action: string): HTMLElement[] => {
  const elements = selfAndBelowOf(root).filter(isHtmlElement);

  return elements.filter((element) => element.dataset['action'] === action);
};

/** The text of each child of `parent`, in order; `[]` when there is no `parent`. */
export const textsOf = (parent: Element | undefined): (string | null)[] => {
  if (parent === undefined) return [];

  const children = Array.from(parent.children);

  return children.map(textOf);
};
