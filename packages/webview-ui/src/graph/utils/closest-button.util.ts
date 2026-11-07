/** The button matching `selector` that a delegated click landed on or inside; `null` when it landed on none. */
export const closestButtonOf = (event: Event, selector: string): HTMLButtonElement | null => {
  const { target } = event;

  if (!(target instanceof Element)) return null;

  return target.closest<HTMLButtonElement>(selector);
};
