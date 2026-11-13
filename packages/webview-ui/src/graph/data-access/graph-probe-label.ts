import type { NodeSingular } from 'cytoscape';

/** `value[key]` when `value` is an object, else `undefined`: Cytoscape's internals are untyped. */
const fieldOf = (value: unknown, key: string): unknown => {
  const isObject = typeof value === 'object' && value !== null;

  if (!isObject) return undefined;

  return Reflect.get(value, key);
};

/** `value` when it is a number, else `fallback`. */
const numberOr = <T>(value: unknown, fallback: T): number | T => (typeof value === 'number' ? value : fallback);

/**
 * The main label box width Cytoscape caches on `node` (cytoscape 3.34 `_private.labelBounds.main.w`), read after
 * `node.boundingBox()` builds it, so the probe sees what every `boundingBox()` caller sees; `null` while there is none.
 */
export const labelBoxWidthOf = (node: Pick<NodeSingular, 'boundingBox'>): number | null => {
  node.boundingBox();

  const internals: unknown = Reflect.get(node, '_private');
  const labelBounds = fieldOf(internals, 'labelBounds');
  const main = fieldOf(labelBounds, 'main');
  const width = fieldOf(main, 'w');

  return numberOr(width, null);
};

/** The label width Cytoscape measured for `node` (cytoscape 3.34 `_private.rstyle.labelWidth`); 0 while it measured none. */
export const labelWidthOf = (node: Pick<NodeSingular, 'boundingBox'>): number => {
  const internals: unknown = Reflect.get(node, '_private');
  const rstyle = fieldOf(internals, 'rstyle');
  const width = fieldOf(rstyle, 'labelWidth');

  return numberOr(width, 0);
};
