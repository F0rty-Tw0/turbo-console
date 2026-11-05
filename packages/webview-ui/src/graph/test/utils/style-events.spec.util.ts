import type { Core, EventObjectEdge, EventObjectNode } from 'cytoscape';

/** The `style` events `write` fires on `cy`; they fire only when `cy` was built with `styleEnabled: true`. */
export const styleEventsDuring = (cy: Core, write: () => void): number => {
  let count = 0;

  cy.on('style', (): void => void count++);
  write();

  return count;
};

/** The sorted ids of the elements `write` restyles on `cy`, which needs `styleEnabled: true`. */
export const restyledIdsDuring = (cy: Core, write: () => void): string[] => {
  const ids = new Set<string>();

  cy.on('style', (event: EventObjectNode | EventObjectEdge): void => void ids.add(event.target.id()));
  write();

  const restyled = [...ids];

  return restyled.sort();
};
