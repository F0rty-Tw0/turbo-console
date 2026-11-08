import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { dirtyEdgeEndIdsOf } from './graph-probe-edge-ends.ts';
import { canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

/** c comes before a, so the ids only read sorted when the probe sorts them. */
const ELEMENTS: ElementDefinition[] = [canvasNodeOf('c'), canvasNodeOf('a'), canvasNodeOf('b'), canvasEdgeOf('a', 'b')];

const graphOf = (): Core => cytoscape({ headless: true, elements: ELEMENTS });

/** The internals Cytoscape keeps on element `id`, untyped like the renderer. */
const internalsOf = (cy: Core, id: string): object => {
  const internals: unknown = Reflect.get(cy.$id(id), '_private');

  if (typeof internals !== 'object' || internals === null) throw new Error('spec: no internals on the element');

  return internals;
};

/** Sets `cleanConnected` on the rendered style of node `id`, as Cytoscape's rendered style queue does. */
const markCleanConnected = (cy: Core, id: string, isClean: boolean): void => {
  const internals = internalsOf(cy, id);
  const rstyle: unknown = Reflect.get(internals, 'rstyle');

  if (typeof rstyle !== 'object' || rstyle === null) throw new Error('spec: no rendered style on the element');

  Reflect.set(rstyle, 'cleanConnected', isClean);
};

describe('FEATURE: dirtyEdgeEndIdsOf', () => {
  it('GIVEN a graph never queued for a rendered style WHEN the probe reads it THEN no node keeps its edges dirty', () => {
    const cy = graphOf();

    expect(dirtyEdgeEndIdsOf(cy)).toStrictEqual([]);
  });

  it('GIVEN a marked dirty and b marked clean WHEN the probe reads it THEN only a keeps its edges dirty', () => {
    const cy = graphOf();

    markCleanConnected(cy, 'a', false);
    markCleanConnected(cy, 'b', true);

    expect(dirtyEdgeEndIdsOf(cy)).toStrictEqual(['a']);
  });

  it('GIVEN c, added before a, and a marked dirty WHEN the probe reads it THEN their ids come sorted', () => {
    const cy = graphOf();

    markCleanConnected(cy, 'c', false);
    markCleanConnected(cy, 'a', false);

    expect(dirtyEdgeEndIdsOf(cy)).toStrictEqual(['a', 'c']);
  });

  it('GIVEN a node without a rendered style WHEN the probe reads it THEN it throws', () => {
    const cy = graphOf();

    Reflect.deleteProperty(internalsOf(cy, 'b'), 'rstyle');

    expect(() => dirtyEdgeEndIdsOf(cy)).toThrow('graph e2e: no rendered style on a node');
  });
});
