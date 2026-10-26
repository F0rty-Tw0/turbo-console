/** Every element under `root`, depth first. */
const descendantsOf = (root: Element): Element[] => {
  const children = Array.from(root.children);

  return children.flatMap((child): Element[] => {
    const below = descendantsOf(child);

    return [child, ...below];
  });
};

/** The fake DOM's `classList` has no `contains`, so this reads `className`. */
export const hasClass = (element: Element, name: string): boolean => {
  const classes = element.className.split(' ');

  return classes.includes(name);
};

const isNameButton = (element: Element): boolean => hasClass(element, 'details-name');

const textOf = (element: Element): string | null => element.textContent;

/** The text of every package name button under `root`, in document order. */
export const namesIn = (root: Element): (string | null)[] => {
  const names = descendantsOf(root).filter(isNameButton);

  return names.map(textOf);
};
