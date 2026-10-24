/** Runs in the page through `evaluate`, so it reads only its argument: a click at the element's centre lands on it or inside it. */
export const isTopmostAtCentre = (element: Element): boolean => {
  const { left, top, width, height } = element.getBoundingClientRect();
  const hit = document.elementFromPoint(left + width / 2, top + height / 2);

  return hit !== null && element.contains(hit);
};
