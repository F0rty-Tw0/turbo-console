/** `element`, then every element under it, depth first. */
const selfAndBelowOf = (element: Element): Element[] => {
  const children = Array.from(element.children);
  const below = children.flatMap(selfAndBelowOf);

  return [element, ...below];
};

const isNameButton = (element: Element): boolean => element.classList.contains('details-name');

const textOf = (element: Element): string | null => element.textContent;

/** The text of every package name button in `root` or under it, in document order. */
export const namesIn = (root: Element): (string | null)[] => {
  const names = selfAndBelowOf(root).filter(isNameButton);

  return names.map(textOf);
};
