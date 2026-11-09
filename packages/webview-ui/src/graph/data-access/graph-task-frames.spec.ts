import cytoscape from 'cytoscape';
import type { BoundingBox12, Core, ElementDefinition, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { applyBoxFrames, refitBoxFrames, reframeBox, unframeBox } from './graph-task-frames.ts';
import { BOX_FRAMED_CLASS, TASK_BOX_CLASS } from '../common/graph-task.const.ts';
import { EXPORTING_CLASS } from '../common/graph.const.ts';
import type { BoxFrame, BoxFrames } from '../common/layout.type.ts';
import { frameLineOf, sideErrorOf } from '../test/utils/box-frame.spec.util.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const PRESET = { name: 'preset', fit: false };

/** `pkg:api` as ELK framed it: 150 x 120 around its task, title placeholder 40 px in from the left side. */
const FRAME: BoxFrame = { leafId: 'api#build', left: -75, right: 75, top: -57, bottom: 63, titleX: -35, titleY: -49 };

const FRAMES: BoxFrames = { 'pkg:api': FRAME };

/** The frame's sides around the task centre (100, 100). */
const FRAMED_SIDES: BoundingBox12 = { x1: 25, x2: 175, y1: 43, y2: 163 };

/** A frame one 32 px padding around the 80 x 32 task on every side, so no side has an extra. */
const TIGHT_FRAME: BoxFrame = { ...FRAME, left: -72, right: 72, top: -48, bottom: 48 };

const TIGHT_FRAMES: BoxFrames = { 'pkg:api': TIGHT_FRAME };

const TIGHT_SIDES: BoundingBox12 = { x1: 28, x2: 172, y1: 52, y2: 148 };

/** The box `pkg:api` holds the 80 x 32 task `api#build` at (100, 100); fresh per core, since Cytoscape keeps the data objects. */
const elementsOf = (): ElementDefinition[] => {
  const boxData = { id: 'pkg:api', title: 'api', minWidth: 30 };
  const taskData = { id: 'api#build', parent: 'pkg:api', width: 80, height: 32 };
  const position = { x: 100, y: 100 };
  const box: ElementDefinition = { data: boxData, classes: TASK_BOX_CLASS };
  const task: ElementDefinition = { data: taskData, position };

  return [box, task];
};

const boxOf = (cy: Core): NodeSingular => cy.getElementById('pkg:api');

const boxErrorOf = (cy: Core, sides: BoundingBox12): number => {
  const line = frameLineOf(boxOf(cy));

  return sideErrorOf(line, sides);
};

const coreOf = (): Core => {
  const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

  return cytoscape({ headless: true, styleEnabled: true, layout: PRESET, elements: elementsOf(), style });
};

describe('FEATURE: applyBoxFrames, unframeBox and reframeBox', () => {
  let cy: Core;

  beforeEach(() => {
    cy = coreOf();
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN pkg:api with a frame for its task', () => {
    const frames = FRAMES;

    describe('WHEN applied', () => {
      beforeEach(() => {
        applyBoxFrames(cy, frames);
      });

      it('THEN the box is framed', () => {
        expect(boxOf(cy).hasClass(BOX_FRAMED_CLASS)).toBe(true);
      });

      it('THEN the box is drawn on its frame, within 1 px of each side', () => {
        const error = boxErrorOf(cy, FRAMED_SIDES);

        expect(error).toBeLessThanOrEqual(1);
      });

      it('THEN the box keeps the frame as data', () => {
        expect(boxOf(cy).data('boxFrame')).toStrictEqual(FRAME);
      });

      // Cytoscape starts a `left-inside` label one padding inside the content and ends a `top` label at the frame's top,
      // each moved by its margin; the placeholder spans x 65.. and y 51..64.
      it('THEN the title starts at the placeholder left and ends at its bottom', () => {
        const box = boxOf(cy);
        const { x, y } = box.position();
        const padding = Number(box.numericStyle('padding'));
        const left = x - box.width() / 2 + padding + Number(box.numericStyle('text-margin-x'));
        const bottom = y - box.height() / 2 - padding + Number(box.numericStyle('text-margin-y'));
        const exact = [left, bottom];
        const corner = exact.map(Math.round);

        expect(corner).toStrictEqual([65, 64]);
      });

      it('WHEN the task moves by (50, 20) THEN the box moves with it', () => {
        const moved: BoundingBox12 = { x1: 75, x2: 225, y1: 63, y2: 183 };

        cy.getElementById('api#build').position({ x: 150, y: 120 });

        expect(boxErrorOf(cy, moved)).toBeLessThanOrEqual(1);
      });

      it('WHEN the stylesheet is applied again THEN the box is still framed on its frame', () => {
        const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

        cy.style(style);

        expect([boxOf(cy).hasClass(BOX_FRAMED_CLASS), boxErrorOf(cy, FRAMED_SIDES) <= 1]).toStrictEqual([true, true]);
      });

      it('WHEN the box is exported THEN its title keeps the frame margin', () => {
        const box = boxOf(cy);

        box.addClass(EXPORTING_CLASS);

        expect(box.numericStyle('text-margin-x')).toBe(box.data('frameTitleX'));
      });
    });
  });

  describe('GIVEN a frame narrower than the task on the left', () => {
    const narrow: BoxFrame = { ...FRAME, left: -30 };
    const frames: BoxFrames = { 'pkg:api': narrow };

    it('WHEN applied THEN the left extra is 0, never negative', () => {
      applyBoxFrames(cy, frames);

      expect(boxOf(cy).data('frameLeft')).toBe(0);
    });
  });

  describe('GIVEN a frame reaching further past the task on the left than the right and on the top than the bottom', () => {
    const uneven: BoxFrame = { ...FRAME, left: -90, top: -70 };
    const frames: BoxFrames = { 'pkg:api': uneven };

    it('WHEN applied THEN the box is drawn on its frame, within 1 px of each side', () => {
      applyBoxFrames(cy, frames);

      expect(boxErrorOf(cy, { x1: 10, x2: 175, y1: 30, y2: 163 })).toBeLessThanOrEqual(1);
    });
  });

  describe('GIVEN a frame one padding around the task on every side', () => {
    const frames = TIGHT_FRAMES;

    // The task's bounds reach 1.5 px past its body (half its border and Cytoscape's 1 px antialiasing margin), so a box
    // with the full 32 px padding would draw 1.5 px outside the frame on each side.
    it('WHEN applied THEN the box is drawn on its frame, within 1 px of each side', () => {
      applyBoxFrames(cy, frames);

      expect(boxErrorOf(cy, TIGHT_SIDES)).toBeLessThanOrEqual(1);
    });
  });

  // Cytoscape counts a task's border in the box's size, and in a browser its outline too (headless it skips outlines):
  // a 5 px border reaches 2 px further than the 1 px one, as a 2 px run outline does.
  describe('GIVEN a box framed one padding around its task, whose task then draws a 5 px border', () => {
    beforeEach(() => {
      applyBoxFrames(cy, TIGHT_FRAMES);
      cy.getElementById('api#build').style('border-width', 5);
    });

    it('WHEN refitted THEN the box is drawn on its frame, within 1 px of each side', () => {
      refitBoxFrames(cy);

      expect(boxErrorOf(cy, TIGHT_SIDES)).toBeLessThanOrEqual(1);
    });

    it('WHEN unframed and reframed THEN the box is drawn on its frame, within 1 px of each side', () => {
      unframeBox(boxOf(cy));
      reframeBox(boxOf(cy));

      expect(boxErrorOf(cy, TIGHT_SIDES)).toBeLessThanOrEqual(1);
    });
  });

  describe('GIVEN frames of a box or task that is not drawn', () => {
    const leafless: BoxFrame = { ...FRAME, leafId: 'api#gone' };
    const frames: BoxFrames = { 'pkg:gone': FRAME, 'pkg:api': leafless };

    it('WHEN applied THEN nothing is framed', () => {
      applyBoxFrames(cy, frames);

      expect(cy.nodes(`.${BOX_FRAMED_CLASS}`)).toHaveLength(0);
    });
  });

  describe('GIVEN a framed box', () => {
    beforeEach(() => {
      applyBoxFrames(cy, FRAMES);
    });

    it('WHEN unframed THEN it drops the class and keeps the frame data', () => {
      unframeBox(boxOf(cy));

      expect([boxOf(cy).hasClass(BOX_FRAMED_CLASS), boxOf(cy).data('boxFrame')]).toStrictEqual([false, FRAME]);
    });

    it('WHEN unframed and reframed THEN it is drawn on its frame again', () => {
      unframeBox(boxOf(cy));
      reframeBox(boxOf(cy));

      expect([boxOf(cy).hasClass(BOX_FRAMED_CLASS), boxErrorOf(cy, FRAMED_SIDES) <= 1]).toStrictEqual([true, true]);
    });
  });

  describe('GIVEN a box without a frame', () => {
    it('WHEN reframed THEN it gets no class', () => {
      reframeBox(boxOf(cy));

      expect(boxOf(cy).hasClass(BOX_FRAMED_CLASS)).toBe(false);
    });

    it('WHEN it carries the class and is unframed THEN it keeps the class: only a framed box drops it', () => {
      boxOf(cy).addClass(BOX_FRAMED_CLASS);

      unframeBox(boxOf(cy));

      expect(boxOf(cy).hasClass(BOX_FRAMED_CLASS)).toBe(true);
    });
  });
});
