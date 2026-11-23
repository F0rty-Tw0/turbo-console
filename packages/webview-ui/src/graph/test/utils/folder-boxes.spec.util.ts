import type { Core, NodeCollection } from 'cytoscape';
import { vi } from 'vitest';
import type { MockInstance } from 'vitest';

type Movable = Pick<NodeCollection, 'move'>;

const isMovable = (value: unknown): value is Movable => typeof value === 'object' && value !== null && 'move' in value;

/** The resolved style `name` of the element `id` as text; Cytoscape types `style(name)` as `any`. */
export const styleTextOf = (cy: Core, id: string, name: string): string => {
  const element = cy.getElementById(id);
  const value: unknown = element.style(name);

  return typeof value === 'string' ? value : '';
};

/** A spy on `move` of every Cytoscape collection: each query builds a new collection, so it sits on their shared prototype; restore it after. */
export const moveSpyOf = (cy: Core): MockInstance<Movable['move']> => {
  const shared: unknown = Object.getPrototypeOf(cy.collection());

  if (!isMovable(shared)) throw new Error('Cytoscape collections have no move');

  return vi.spyOn(shared, 'move');
};
