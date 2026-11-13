import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

/**
 * Cytoscape reads `useCache` (bounds.mjs:902) but its typings omit it; `includeLabels` is the default, named so the
 * options share a typed key.
 */
const SLOW_PATH = { useCache: false, includeLabels: true };

/** `value` when it is an object; throws naming `what` otherwise. */
const objectOf = (value: unknown, what: string): object => {
  if (typeof value !== 'object' || value === null) throw new Error(`spec: no ${what} on the node`);

  return value;
};

/** The rendered style Cytoscape keeps on `node`, untyped like the renderer; `{}` until a renderer fills it. */
const renderedStyleOf = (node: NodeSingular): object => {
  const privateValue: unknown = Reflect.get(node, '_private');
  const internals = objectOf(privateValue, 'internals');
  const rstyle: unknown = Reflect.get(internals, 'rstyle');

  return objectOf(rstyle, 'rendered style');
};

/** Sets `rstyle.clean` on `node`, as Cytoscape's renderer does once it recalculated the rendered style. */
const setClean = (node: NodeSingular, isClean: boolean): void => {
  Reflect.set(renderedStyleOf(node), 'clean', isClean);
};

const isClean = (node: NodeSingular): boolean => Reflect.get(renderedStyleOf(node), 'clean') === true;

describe('FEATURE: the cytoscape boundingBox patch', () => {
  let cy: Core;
  let node: NodeSingular;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: [canvasNodeOf('a')] });
    node = cy.$id('a');
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a node with a clean rendered style WHEN its class changes and boundingBox runs THEN the rendered style is dirty again', () => {
    setClean(node, true);
    node.addClass('changed');
    node.boundingBox();

    expect(isClean(node)).toBe(false);
  });

  it('GIVEN a node whose style is not dirty WHEN boundingBox runs THEN its rendered style stays clean', () => {
    node.boundingBox();
    setClean(node, true);
    // The slow path: a clean single node otherwise takes the fast path (bounds.mjs:913) and never reaches the patched loop.
    node.boundingBox(SLOW_PATH);

    expect(isClean(node)).toBe(true);
  });
});
