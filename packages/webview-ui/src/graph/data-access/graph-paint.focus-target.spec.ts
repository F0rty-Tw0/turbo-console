import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyFocusTarget } from './graph-paint.ts';
import { FOCUS_TARGET_CLASS } from '../common/graph.const.ts';
import { CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';

describe('FEATURE: applyFocusTarget', () => {
  let cy: Core;

  const targetIds = (): string[] => cy.nodes(`.${FOCUS_TARGET_CLASS}`).map((node: NodeSingular): string => node.id());

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN no focus target', () => {
    it('WHEN b becomes it THEN b alone has the focus-target class', () => {
      applyFocusTarget(cy, 'b');

      expect(targetIds()).toStrictEqual(['b']);
    });
  });

  describe('GIVEN b is the focus target', () => {
    beforeEach(() => {
      applyFocusTarget(cy, 'b');
    });

    it('WHEN c becomes it THEN c alone has the class', () => {
      applyFocusTarget(cy, 'c');

      expect(targetIds()).toStrictEqual(['c']);
    });

    it('WHEN the focus clears THEN no package has the class', () => {
      applyFocusTarget(cy, null);

      expect(targetIds()).toStrictEqual([]);
    });

    it('WHEN b is set again THEN no class event fires, so no package is restyled', () => {
      let classEvents = 0;

      cy.on('class', (): void => {
        classEvents += 1;
      });
      applyFocusTarget(cy, 'b');

      expect(classEvents).toBe(0);
    });
  });
});
