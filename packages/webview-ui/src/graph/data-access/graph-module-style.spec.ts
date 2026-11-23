import cytoscape from 'cytoscape';
import type { Core, EdgeDataDefinition, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { moduleRulesOf } from './graph-module-style.ts';
import { graphStyleOf } from './graph-style.ts';
import { MODULE_LAZY_CLASS, MODULE_LINK_CLASS, MODULE_TYPE_CLASS } from '../common/graph-module.const.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { THEME_COLORS_STUB } from '../test/stubs/theme-colors.stub.ts';
import { CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

/** The class modules mode once drew a link on its ELK route with; a link that still carries it must draw plain. */
const OLD_ROUTED_CLASS = 'module-routed';

const SEGMENT_DATA = { segWeights: [0.5], segDistances: [-40], srcEnd: '0px 16px', tgtEnd: '0px -16px' };

const LINK_CLASSES: Record<string, string> = {
  solid: `${MODULE_LINK_CLASS} ${OLD_ROUTED_CLASS}`,
  lazy: `${MODULE_LINK_CLASS} ${MODULE_LAZY_CLASS} ${OLD_ROUTED_CLASS}`,
  type: `${MODULE_LINK_CLASS} ${MODULE_TYPE_CLASS} ${OLD_ROUTED_CLASS}`
};

const linkOf = ([id, classes]: [string, string]): ElementDefinition => {
  const data: EdgeDataDefinition = { id, source: 'a', target: 'b', count: '2', ...SEGMENT_DATA };
  const link: ElementDefinition = { data, classes };

  return link;
};

const LINKS = Object.entries(LINK_CLASSES).map(linkOf);

const ELEMENTS: ElementDefinition[] = [canvasNodeOf('a'), canvasNodeOf('b'), ...LINKS];

const drawnStyleOf = (cy: Core, id: string): string[] => {
  const edge = cy.getElementById(id);
  const drawn = [String(edge.style('curve-style')), String(edge.style('z-compound-depth'))];

  return drawn;
};

describe('FEATURE: moduleRulesOf', () => {
  describe('GIVEN the module link rules', () => {
    it.each([
      ['edge.module-lazy', 'line-style', 'dotted'],
      ['edge.module-type', 'line-style', 'dashed'],
      ['node.module-stub', 'border-style', 'dashed'],
      ['edge.module-link', 'label', 'data(count)'],
      ['edge.module-link', 'min-zoomed-font-size', 5]
    ])('WHEN %s is read THEN %s is %s', (selector, property, value) => {
      const rule = moduleRulesOf(THEME_COLORS_STUB, 'sans').find((entry) => entry.selector === selector);
      const style = new Map(Object.entries(rule?.style ?? {}));

      expect(style.get(property)).toBe(value);
    });
  });

  describe('GIVEN module links in the graph stylesheet, each with the old routed class and segment data', () => {
    let cy: Core;

    beforeEach(() => {
      cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
    });

    afterEach(() => {
      cy.destroy();
    });

    it.each(Object.keys(LINK_CLASSES))(
      'WHEN the %s link is styled THEN it is a plain bezier at card depth, as a package edge',
      (id) => {
        expect(drawnStyleOf(cy, id)).toStrictEqual(['bezier', 'auto']);
      }
    );
  });
});
