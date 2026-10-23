/** An outside press's default action blurs to the body when it lands on nothing focusable; focus goes back. */
export const refocusIfLost = (returnTo: HTMLElement): void => {
  const active = document.activeElement;
  const isLost = active === null || active === document.body;

  if (isLost) returnTo.focus();
};

/** The press landed in the open menu or on its own "…". */
export const isOwnPress = (event: PointerEvent, menu: HTMLElement, opener: HTMLButtonElement | null): boolean => {
  const path = event.composedPath();
  const isInMenu = path.includes(menu);
  const isOnOpener = opener !== null && path.includes(opener);

  return isInMenu || isOnOpener;
};

/** Focus left for a node outside the menu other than its "…"; a blur to nothing (`null`) does not count. */
export const isFocusAway = (event: FocusEvent, menu: HTMLElement, opener: HTMLButtonElement | null): boolean => {
  const next = event.relatedTarget;

  if (!(next instanceof Node)) return false;

  const isInMenu = menu.contains(next);

  return !isInMenu && next !== opener;
};
