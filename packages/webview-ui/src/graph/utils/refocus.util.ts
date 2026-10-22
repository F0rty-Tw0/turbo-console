import type { Refocus } from '../common/graph-details.type.ts';

/** `focused` is the `data-name` of the list item that had focus before the list was rebuilt, `names` the new items'. */
export const refocusOf = (focused: string | null, names: string[]): Refocus => {
  if (focused === null) return 'none';

  const isListed = names.includes(focused);

  if (isListed) return 'item';

  return 'heading';
};
