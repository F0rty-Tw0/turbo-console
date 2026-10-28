/** The first built menu item; throws when nothing was built. */
export const firstItemOf = (items: HTMLElement[]): HTMLElement => {
  const [built] = items;

  if (built === undefined) throw new Error('widget-menu spec: no item built');

  return built;
};

/** The first built item's first child, the icon column; throws when it has none. */
export const iconColumnOf = (items: HTMLElement[]): Element => {
  const [column] = firstItemOf(items).children;

  if (column === undefined) throw new Error('widget-menu spec: no icon column built');

  return column;
};
