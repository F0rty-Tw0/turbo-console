import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { labelPackages, packageWritersOf } from './graph-package-nodes.ts';
import { lengthSizeOf } from '../test/utils/length-size.spec.util.ts';

const PACKAGE_DATA = { id: '@org/x', label: '@org/x', width: 0, height: 32 };

const PACKAGE: ElementDefinition = { data: PACKAGE_DATA };

describe('FEATURE: the root // box across setLabels', () => {
  const sizeTexts = new Map([['//', '(root) @x/savings']]);

  const rootWidthOf = (cy: Core): unknown => cy.getElementById('//').data('width');

  describe('GIVEN // sized for (root) @x/savings', () => {
    it('WHEN labelled (root) savings and then @x/savings THEN the width stays that of the sizing text', () => {
      const cy = cytoscape({ headless: true });
      const writers = packageWritersOf(cy);

      writers.setGraph(['//'], [], {}, lengthSizeOf);
      writers.setLabels(new Map([['//', '(root) savings']]), sizeTexts);

      const hiddenWidth = rootWidthOf(cy);

      writers.setLabels(new Map([['//', '@x/savings']]), sizeTexts);

      expect(hiddenWidth).toBe(170);
      expect(rootWidthOf(cy)).toBe(170);

      cy.destroy();
    });
  });

  describe('GIVEN a package whose sizeTexts entry is absent', () => {
    it('WHEN labelled THEN it is sized as today', () => {
      const cy = cytoscape({ headless: true, elements: [PACKAGE] });

      labelPackages(cy, new Map([['@org/x', 'x']]), sizeTexts, lengthSizeOf);

      expect(cy.getElementById('@org/x').data('width')).toBe(60);

      cy.destroy();
    });
  });
});
