import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { labelBoxWidthOf, labelWidthOf } from './graph-probe-label.ts';
import { createGraphProbe } from './graph-probe.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe } from '../common/graph-probe.type.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

type LabelRow = {
  readonly name: string;
  readonly internals: object;
  readonly box: number | null;
  readonly label: number;
};

/** The spike's stale case: a 45 px label box cached for a 94 px label. */
const MEASURED_BOX = { w: 45 };

const MEASURED_BOUNDS = { main: MEASURED_BOX };

const MEASURED_STYLE = { labelWidth: 94 };

const MEASURED = { labelBounds: MEASURED_BOUNDS, rstyle: MEASURED_STYLE };

const NO_BOX_BOUNDS = { main: null };

const NO_BOX = { labelBounds: NO_BOX_BOUNDS, rstyle: {} };

const ROWS: LabelRow[] = [
  { name: 'a measured label', internals: MEASURED, box: 45, label: 94 },
  { name: 'no label box', internals: NO_BOX, box: null, label: 0 },
  { name: 'no internals', internals: {}, box: null, label: 0 }
];

type LabelNode = Pick<NodeSingular, 'boundingBox'>;

/** A node whose Cytoscape internals are `internals`, set by key as the library names them. */
const stubOf = (internals: object): LabelNode => {
  const stub: LabelNode = { boundingBox: vi.fn() };

  Reflect.set(stub, '_private', internals);

  return stub;
};

describe('FEATURE: labelBoxWidthOf and labelWidthOf', () => {
  it.each(ROWS)('GIVEN $name WHEN the widths are read THEN the box is $box and the label $label', (row: LabelRow) => {
    const stub = stubOf(row.internals);

    expect(labelBoxWidthOf(stub)).toBe(row.box);
    expect(labelWidthOf(stub)).toBe(row.label);
  });

  it('GIVEN a node WHEN its label box width is read THEN boundingBox runs once, before the internals are read', () => {
    const boundingBox = vi.fn();
    const readInternals = vi.fn((): object => MEASURED);
    const stub: LabelNode = { boundingBox };

    Object.defineProperty(stub, '_private', { get: readInternals });
    labelBoxWidthOf(stub);

    const [boxCall] = boundingBox.mock.invocationCallOrder;
    const [readCall] = readInternals.mock.invocationCallOrder;

    expect(boundingBox).toHaveBeenCalledOnce();
    expect(boxCall).toBeLessThan(readCall ?? 0);
  });
});

describe('FEATURE: createGraphProbe label widths', () => {
  let cy: Core;
  let probe: GraphProbe;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: [canvasNodeOf('a')] });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));

    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };

    probe = createGraphProbe(view, GRAPH_PROBE_STUB);
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a headless graph WHEN the probe reads a node THEN it has no label box and no measured label', () => {
    expect(probe.nodes()[0]).toMatchObject({ labelBoxWidth: null, labelWidth: 0 });
  });
});
