import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { labelFitOf } from './graph-probe-label.ts';
import type { ProbeLabelFit } from '../common/graph-probe-label.type.ts';
import { canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

type LabelRow = {
  readonly name: string;
  readonly bounds: object | undefined;
  readonly rstyle: object | undefined;
  readonly box: number | null;
  readonly label: number;
};

/** The spike's stale case: a 45 px label box for a 94 px label. */
const MEASURED_BOX = { w: 45 };

const MEASURED_BOUNDS = { main: MEASURED_BOX };

const MEASURED_STYLE = { labelWidth: 94 };

const NO_BOX_BOUNDS = { main: null };

const ROWS: LabelRow[] = [
  { name: 'a measured label', bounds: MEASURED_BOUNDS, rstyle: MEASURED_STYLE, box: 45, label: 94 },
  { name: 'no label box', bounds: NO_BOX_BOUNDS, rstyle: {}, box: null, label: 0 },
  { name: 'no label internals', bounds: undefined, rstyle: undefined, box: null, label: 0 }
];

/** The bypass the fit reads back: a 120 px node with a 7 px label margin. */
const BYPASS = { width: 120, 'text-margin-x': 7 };

/** Sets Cytoscape's `_private` `key` on `node` by the name the library uses. */
const setInternal = (node: NodeSingular, key: string, value: unknown): void => {
  const internals: unknown = Reflect.get(node, '_private');

  if (typeof internals === 'object' && internals !== null) Reflect.set(internals, key, value);
};

/** Makes `node.boundingBox()` cache `bounds` as its label bounds, as Cytoscape's does, and return the real box. */
const buildBoundsOn = (node: NodeSingular, bounds: object | undefined): void => {
  const box = node.boundingBox();
  const buildBounds = (): typeof box => {
    setInternal(node, 'labelBounds', bounds);

    return box;
  };

  vi.spyOn(node, 'boundingBox').mockImplementation(buildBounds);
};

describe('FEATURE: labelFitOf', () => {
  let cy: Core;
  let node: NodeSingular;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: [canvasNodeOf('a')] });
    node = cy.getElementById('a');
    node.style(BYPASS);
  });

  afterEach(() => {
    cy.destroy();
  });

  it.each(ROWS)('GIVEN $name WHEN its fit is read THEN the box is $box and the label $label', (row: LabelRow) => {
    const expected: ProbeLabelFit = { width: 120, labelWidth: row.label, labelBoxWidth: row.box, textMarginX: 7 };

    setInternal(node, 'rstyle', row.rstyle);
    buildBoundsOn(node, row.bounds);

    expect(labelFitOf(cy, 'a')).toStrictEqual(expected);
  });

  describe('GIVEN a label box boundingBox builds', () => {
    it('WHEN its fit is read THEN it reads the box built', () => {
      setInternal(node, 'labelBounds', NO_BOX_BOUNDS);
      buildBoundsOn(node, MEASURED_BOUNDS);

      expect(labelFitOf(cy, 'a')?.labelBoxWidth).toBe(45);
    });
  });

  describe('GIVEN no node b', () => {
    it('WHEN its fit is read THEN it is null', () => {
      expect(labelFitOf(cy, 'b')).toBeNull();
    });
  });
});
