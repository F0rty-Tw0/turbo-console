import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { labelFitOf } from './graph-probe-label.ts';
import { createGraphProbe } from './graph-probe.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { ProbeLabelFit } from '../common/graph-probe-label.type.ts';
import type { GraphProbe } from '../common/graph-probe.type.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

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

  it('GIVEN a label box boundingBox builds WHEN its fit is read THEN it reads the box built', () => {
    setInternal(node, 'labelBounds', NO_BOX_BOUNDS);
    buildBoundsOn(node, MEASURED_BOUNDS);

    expect(labelFitOf(cy, 'a')?.labelBoxWidth).toBe(45);
  });

  it('GIVEN no node b WHEN its fit is read THEN it is null', () => {
    expect(labelFitOf(cy, 'b')).toBeNull();
  });
});

describe('FEATURE: createGraphProbe label fit', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: [canvasNodeOf('a')] });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  const probeOf = (): GraphProbe => {
    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };

    return createGraphProbe(view, GRAPH_PROBE_STUB);
  };

  it('GIVEN a headless graph WHEN the probe reads the fit of a THEN it has no label box and no measured label', () => {
    expect(probeOf().labelFit('a')).toMatchObject({ labelBoxWidth: null, labelWidth: 0 });
  });

  it('GIVEN a headless graph WHEN the probe reads its nodes THEN no node runs boundingBox', () => {
    const boundingBox = vi.spyOn(cy.getElementById('a'), 'boundingBox');

    probeOf().nodes();

    expect(boundingBox).not.toHaveBeenCalled();
  });
});
