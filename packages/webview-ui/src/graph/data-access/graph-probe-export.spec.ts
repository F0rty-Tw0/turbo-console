import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exportLabelOf } from './graph-probe-export.ts';
import { EXPORTING_CLASS } from '../common/graph.const.ts';

const COUNTS_TEXT = '10 files · 3 cached · 1 failed';

const UMBRELLA_DATA = { id: 'u', label: 'e2e-ci', countsText: COUNTS_TEXT };

const ELEMENTS: ElementDefinition[] = [{ data: UMBRELLA_DATA }];

const NAME_LABEL = { label: 'data(label)' };

const COUNTS_LABEL = { label: 'data(countsText)' };

/** Style rules: the node draws its name, and its counts while it is classed `exporting`. */
const STYLE = [
  { selector: 'node', style: NAME_LABEL },
  { selector: `node.${EXPORTING_CLASS}`, style: COUNTS_LABEL }
];

describe('FEATURE: exportLabelOf', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, style: STYLE, elements: ELEMENTS });
  });

  afterEach(() => {
    cy.destroy();
  });

  it("GIVEN an umbrella node WHEN its export label is read THEN it is the exporting rule's label", () => {
    const label = exportLabelOf(cy, 'u');

    expect(label).toBe(COUNTS_TEXT);
  });

  it('GIVEN an umbrella node WHEN its export label is read THEN the exporting class is gone after', () => {
    exportLabelOf(cy, 'u');

    expect(cy.getElementById('u').hasClass(EXPORTING_CLASS)).toBe(false);
  });

  it('GIVEN the read throws WHEN it does THEN the class is still removed', () => {
    const node = cy.getElementById('u');

    vi.spyOn(node, 'style').mockImplementation(() => {
      throw new Error('style read failed');
    });

    expect(() => exportLabelOf(cy, 'u')).toThrow('style read failed');
    expect(node.hasClass(EXPORTING_CLASS)).toBe(false);
  });
});
