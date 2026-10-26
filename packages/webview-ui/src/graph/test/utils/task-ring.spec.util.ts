import type { ElementDefinition, NodeSingular } from 'cytoscape';

/** The node `id` with `label` and `classes`, as the task graph adds it. */
export const classedNodeOf = (id: string, label: string, classes: string): ElementDefinition => {
  const data = { id, label };
  const definition: ElementDefinition = { data, classes };

  return definition;
};

export const outlineWidthOf = (node: NodeSingular): number => Number(node.numericStyle('outline-width'));

/** The outline width, then the border width and colour, as Cytoscape reports them. */
export const ringOf = (node: NodeSingular): unknown[] => {
  const ring: unknown[] = [outlineWidthOf(node), node.numericStyle('border-width'), node.style('border-color')];

  return ring;
};
