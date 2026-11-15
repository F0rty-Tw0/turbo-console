import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { packageWritersOf } from './graph-package-nodes.ts';
import { lengthSizeOf } from '../test/utils/length-size.spec.util.ts';

const NO_SIZE_TEXTS: ReadonlyMap<string, string> = new Map();

describe('FEATURE: packageWritersOf', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the root // drawn by setGraph with a sizer 10 px per character', () => {
    it('WHEN its label root-fixture is set THEN the node reads root-fixture 120 px wide', () => {
      const writers = packageWritersOf(cy);

      writers.setGraph(['//'], [], {}, lengthSizeOf);

      writers.setLabels(new Map([['//', 'root-fixture']]), NO_SIZE_TEXTS);

      const data: unknown = cy.getElementById('//').data();

      expect(data).toMatchObject({ label: 'root-fixture', width: 120 });
    });
  });

  describe('GIVEN no graph drawn', () => {
    it('WHEN labels are set THEN no node is added', () => {
      const writers = packageWritersOf(cy);

      writers.setLabels(new Map([['//', 'root-fixture']]), NO_SIZE_TEXTS);

      expect(cy.nodes()).toHaveLength(0);
    });
  });
});
