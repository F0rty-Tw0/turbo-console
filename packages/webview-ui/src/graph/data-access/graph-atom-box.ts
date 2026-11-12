import type { Core } from 'cytoscape';

import type { AtomChipBox } from '../common/atom-chips.type.ts';

/** The model centre and width of node `id`; `null` when the canvas does not draw it. */
export const atomBoxOf = (cy: Core, id: string): AtomChipBox | null => {
  const node = cy.getElementById(id);
  const isDrawn = node.nonempty();

  if (!isDrawn) return null;

  const box: AtomChipBox = { centre: node.position(), width: node.width() };

  return box;
};
