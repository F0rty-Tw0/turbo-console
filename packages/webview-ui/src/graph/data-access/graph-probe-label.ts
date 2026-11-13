import type { Core } from 'cytoscape';

import { styleNumber } from './graph-probe-state.ts';
import type { ProbeLabelFit } from '../common/graph-probe-label.type.ts';

/** `value[key]` when `value` is an object, else `undefined`: Cytoscape's internals are untyped. */
const fieldOf = (value: unknown, key: string): unknown => {
  const isObject = typeof value === 'object' && value !== null;

  if (!isObject) return undefined;

  return Reflect.get(value, key);
};

/** `value` when it is a number, else `fallback`. */
const numberOr = <T>(value: unknown, fallback: T): number | T => (typeof value === 'number' ? value : fallback);

/**
 * The label fit of node `id`, `null` when there is none. Runs `node.boundingBox()` before it reads the internals, so
 * the cached label box (cytoscape 3.34 `_private.labelBounds.main.w`) is what every `boundingBox()` caller sees. It is
 * the only probe read that runs it on a task node, and `nodes()` never does, so polling nodes heals no stale label box.
 */
export const labelFitOf = (cy: Pick<Core, 'getElementById'>, id: string): ProbeLabelFit | null => {
  const node = cy.getElementById(id);
  const isNone = node.empty();

  if (isNone) return null;

  node.boundingBox();

  const internals: unknown = Reflect.get(node, '_private');
  const labelBounds = fieldOf(internals, 'labelBounds');
  const main = fieldOf(labelBounds, 'main');
  const rstyle = fieldOf(internals, 'rstyle');
  const labelWidth = fieldOf(rstyle, 'labelWidth');
  const labelBoxWidth = fieldOf(main, 'w');
  const fit: ProbeLabelFit = {
    width: node.width(),
    labelWidth: numberOr(labelWidth, 0),
    labelBoxWidth: numberOr(labelBoxWidth, null),
    textMarginX: styleNumber(node, 'text-margin-x')
  };

  return fit;
};
