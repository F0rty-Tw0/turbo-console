const isHtmlElement = (element: Element | undefined): element is HTMLElement => element !== undefined && 'title' in element;

/** The `index`th element child of `parent`; throws when there is none, so a spec reads it without a guard. */
export const childAt = (parent: Element, index: number): HTMLElement => {
  const child = parent.children[index];

  if (!isHtmlElement(child)) throw new Error(`no element child ${index}`);

  return child;
};
