import type { Core } from 'cytoscape';

/** The resolved style `name` of the element `id` as text; Cytoscape types `style(name)` as `any`. */
export const styleTextOf = (cy: Core, id: string, name: string): string => {
  const element = cy.getElementById(id);
  const value: unknown = element.style(name);

  return typeof value === 'string' ? value : '';
};
