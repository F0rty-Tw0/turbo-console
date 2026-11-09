import cytoscape from 'cytoscape';
import type { ElementDefinition, NodeSingular } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { BOX_FRAMED_CLASS, TASK_BOX_CLASS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

/** Frame data as `applyBoxFrames` writes it. */
const FRAME_DATA = {
  framePadding: 30.5,
  frameMinWidth: 220,
  frameMinHeight: 56,
  frameLeft: 70,
  frameRight: 67,
  frameTop: 9,
  frameBottom: 15,
  frameTitleX: -21,
  frameTitleY: 21
};

/** A `web` task box with frame data around one 80 px `build` task, with `classes`. */
const boxOf = (classes: string): NodeSingular => {
  const boxData = { id: 'pkg:web', title: 'web', minWidth: 30, ...FRAME_DATA };
  const childData = { id: 'web#build', parent: 'pkg:web', label: 'build', width: 80, height: 32 };
  const position = { x: 0, y: 0 };
  const box: ElementDefinition = { data: boxData, classes };
  const child: ElementDefinition = { data: childData, classes: TASK_NODE_CLASS, position };
  const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);
  const cy = cytoscape({ headless: true, styleEnabled: true, style, elements: [box, child] });

  return cy.getElementById('pkg:web');
};

/** The frame styles of `box`, in `FRAME_DATA` order. */
const frameStylesOf = (box: NodeSingular): string[] => {
  const names = [
    'padding',
    'min-width',
    'min-height',
    'min-width-bias-left',
    'min-width-bias-right',
    'min-height-bias-top',
    'min-height-bias-bottom',
    'text-margin-x',
    'text-margin-y'
  ];
  const styleOf = (name: string): string => String(box.style(name));

  return names.map(styleOf);
};

describe('FEATURE: taskRulesOf framed task boxes', () => {
  describe('GIVEN a task box with frame data', () => {
    it('WHEN it is box-framed THEN its padding, minimum size, side biases and title margins come from that data', () => {
      const box = boxOf(`${TASK_BOX_CLASS} ${BOX_FRAMED_CLASS}`);

      expect(frameStylesOf(box)).toStrictEqual(['30.5px', '220px', '56px', '70px', '67px', '9px', '15px', '-21px', '21px']);
    });

    it('WHEN it is not box-framed THEN it keeps the plain task box rule', () => {
      const box = boxOf(TASK_BOX_CLASS);

      expect(frameStylesOf(box)).toStrictEqual(['32px', '30px', '0px', '0%', '100%', '0px', '0px', '-32px', '22.5px']);
    });
  });
});
