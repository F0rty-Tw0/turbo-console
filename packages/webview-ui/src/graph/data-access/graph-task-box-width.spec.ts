import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { TASK_BOX_CLASS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

type BoxSizes = {
  readonly childWidth: number;
  readonly minWidth: number;
};

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const TASKS: GraphTask[] = [taskOf('api#build', []), taskOf('web#build', ['api#build'])];

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map<string, NodeSize>(),
  labels: new Map<string, string>(),
  titleWidths: new Map([['web', 130]])
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

const minWidthOf = (cy: Core, id: string): unknown => cy.getElementById(id).data('minWidth');

describe('FEATURE: task box width', () => {
  describe('GIVEN an 80 px task under a 200 px title', () => {
    it('WHEN styled THEN the box is 200 wide and its left edge stays where the plain box has it', () => {
      const box = boxOf({ childWidth: 80, minWidth: 200 });
      const plain = boxOf({ childWidth: 80, minWidth: 0 });

      expect(box.width()).toBe(200);
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

  describe('GIVEN a drawing with a title width for web only', () => {
    it('WHEN shown THEN a package box carries its title width as data(minWidth), 0 when unknown', () => {
      const cy = cytoscape({ headless: true, styleEnabled: true });

      createTaskCanvas(cy).show(DRAWING);

      expect([minWidthOf(cy, 'pkg:web'), minWidthOf(cy, 'pkg:api')]).toStrictEqual([130, 0]);
    });
  });
});
