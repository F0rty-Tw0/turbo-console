import cytoscape from 'cytoscape';
import type { ElementDefinition, NodeSingular } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { TASK_BOX_CLASS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

type BoxSizes = {
  readonly childWidth: number;
  readonly minWidth: number;
};

/** A `web` task box around one `build` task, the stylesheet given to the constructor so its first apply is the one read. */
const boxOf = ({ childWidth, minWidth }: BoxSizes): NodeSingular => {
  const boxData = { id: 'pkg:web', title: 'web', minWidth };
  const childData = { id: 'web#build', parent: 'pkg:web', label: 'build', width: childWidth, height: 32 };
  const position = { x: 0, y: 0 };
  const box: ElementDefinition = { data: boxData, classes: TASK_BOX_CLASS };
  const child: ElementDefinition = { data: childData, classes: TASK_NODE_CLASS, position };
  const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);
  const cy = cytoscape({ headless: true, styleEnabled: true, style, elements: [box, child] });

  return cy.getElementById('pkg:web');
};

const leftEdgeOf = (box: NodeSingular): number => box.position().x - box.width() / 2;

describe('FEATURE: taskRulesOf box width', () => {
  describe('GIVEN an 80 px task under a 200 px title', () => {
    it('WHEN styled THEN the box is 200 wide', () => {
      const box = boxOf({ childWidth: 80, minWidth: 200 });

      expect(box.width()).toBe(200);
    });

    it('WHEN styled THEN its left edge stays where the plain box has it', () => {
      const box = boxOf({ childWidth: 80, minWidth: 200 });
      const plain = boxOf({ childWidth: 80, minWidth: 0 });

      expect(leftEdgeOf(box)).toBe(leftEdgeOf(plain));
    });

    it('WHEN first styled THEN the title may use the 200 px, not the 83 px of the children', () => {
      const box = boxOf({ childWidth: 80, minWidth: 200 });

      expect(box.style('text-max-width')).toBe('200px');
    });
  });

  describe('GIVEN a 300 px task under a 200 px title', () => {
    it('WHEN styled THEN the box width stays the plain box width', () => {
      const box = boxOf({ childWidth: 300, minWidth: 200 });
      const plain = boxOf({ childWidth: 300, minWidth: 0 });

      expect(box.width()).toBe(plain.width());
    });
  });
});
