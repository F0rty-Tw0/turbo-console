import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { probeTitlesOf } from './graph-probe-titles.ts';
import { graphStyleOf } from './graph-style.ts';
import { applyBoxFrames } from './graph-task-frames.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeRect, ProbeTitle } from '../common/graph-probe-titles.type.ts';
import { BOX_FRAMED_CLASS, TASK_BOX_CLASS, TASK_FOLDER_CLASS } from '../common/graph-task.const.ts';
import type { BoxFrame, BoxFrames } from '../common/layout.type.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const APPS_ID = `${String.fromCodePoint(1)}apps`;

const APPS_DATA = { id: APPS_ID, title: 'apps' };

const WEB_DATA = { id: 'pkg:web', parent: APPS_ID, title: 'web' };

const BUILD_DATA = { id: 'web#build', parent: 'pkg:web', width: 80, height: 32 };

/** The folder box `apps` holds the package box `pkg:web`, which holds the task `web#build`. */
const TASK_BOXES: ElementDefinition[] = [
  { data: APPS_DATA, classes: TASK_FOLDER_CLASS },
  { data: WEB_DATA, classes: TASK_BOX_CLASS },
  { data: BUILD_DATA }
];

/** `pkg:web` as ELK framed it: 150 x 120 around `web#build`. */
const WEB_FRAME: BoxFrame = { leafId: 'web#build', left: -75, right: 75, top: -57, bottom: 63, titleX: -35, titleY: -49 };

const WEB_FRAMES: BoxFrames = { 'pkg:web': WEB_FRAME };

type TitleName = Pick<ProbeTitle, 'id' | 'text'>;

const nameOf = (title: ProbeTitle): TitleName => {
  const name: TitleName = { id: title.id, text: title.text };

  return name;
};

const movedBy = (rect: ProbeRect, offset: Position): ProbeRect => {
  const moved: ProbeRect = { ...rect, left: rect.left + offset.x, top: rect.top + offset.y };

  return moved;
};

const firstTitleOf = (cy: Core, origin: Position): ProbeTitle => {
  const [first] = probeTitlesOf(cy, origin);

  if (first === undefined) throw new Error('no package box is probed');

  return first;
};

describe('FEATURE: probeTitlesOf', () => {
  describe('GIVEN a folder box around the package box pkg:web', () => {
    let cy: Core;

    beforeEach(() => {
      const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

      cy = cytoscape({ headless: true, styleEnabled: true, elements: TASK_BOXES, style });
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN the titles are probed THEN only pkg:web is listed, with its drawn title', () => {
      const names = probeTitlesOf(cy, ORIGIN).map(nameOf);

      expect(names).toStrictEqual([{ id: 'pkg:web', text: 'web' }]);
    });

    // Headless Cytoscape measures no font, so the label rect is empty here: this row pins only that the label is not the
    // box. The e2e rows guard the real label rect (a crossed row fails on an empty one).
    it('WHEN the titles are probed THEN the label is the title alone: inside the box, narrower and shorter than it', () => {
      const { label, box } = firstTitleOf(cy, ORIGIN);
      const isInside = label.left >= box.left && label.top >= box.top && label.left + label.width <= box.left + box.width;

      expect([isInside, label.width < box.width, label.height < box.height]).toStrictEqual([true, true, true]);
    });

    it('WHEN the container sits 10 px right of and 20 px below the page corner THEN the label and box move with it', () => {
      const offset: Position = { x: 10, y: 20 };
      const atCorner = firstTitleOf(cy, ORIGIN);
      const moved = firstTitleOf(cy, offset);

      expect([moved.label, moved.box]).toStrictEqual([movedBy(atCorner.label, offset), movedBy(atCorner.box, offset)]);
    });

    it('WHEN the container moves THEN the model box stays put', () => {
      const atCorner = firstTitleOf(cy, ORIGIN);
      const moved = firstTitleOf(cy, { x: 10, y: 20 });

      expect(moved.modelBox).toStrictEqual(atCorner.modelBox);
    });

    it('WHEN the canvas is zoomed to 2 THEN the box doubles and the model box keeps its size', () => {
      const atOne = firstTitleOf(cy, ORIGIN);

      cy.zoom(2);

      const atTwo = firstTitleOf(cy, ORIGIN);

      expect([atTwo.box.width, atTwo.modelBox.width]).toStrictEqual([atOne.box.width * 2, atOne.modelBox.width]);
    });

    it('WHEN the titles are probed THEN pkg:web is not framed and has no frame errors', () => {
      const { isFramed, frameError, titleError } = firstTitleOf(cy, ORIGIN);

      expect([isFramed, frameError, titleError]).toStrictEqual([false, null, null]);
    });
  });

  describe('GIVEN pkg:web drawn on a frame around web#build at (100, 100)', () => {
    let cy: Core;

    beforeEach(() => {
      const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);
      const boxData = { id: 'pkg:web', title: 'web' };
      const buildData = { ...BUILD_DATA };
      const position = { x: 100, y: 100 };
      const layout = { name: 'preset', fit: false };
      const box: ElementDefinition = { data: boxData, classes: TASK_BOX_CLASS };
      const build: ElementDefinition = { data: buildData, position };

      cy = cytoscape({ headless: true, styleEnabled: true, layout, elements: [box, build], style });
      applyBoxFrames(cy, WEB_FRAMES);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN the titles are probed THEN pkg:web is framed, within 1 px of its frame', () => {
      const { isFramed, frameError } = firstTitleOf(cy, ORIGIN);

      expect([isFramed, frameError !== null && frameError <= 1]).toStrictEqual([true, true]);
    });

    it('WHEN its frame data says 10 px further right THEN the frame error is 10 px', () => {
      const shifted: BoxFrame = { ...WEB_FRAME, left: WEB_FRAME.left + 10, right: WEB_FRAME.right + 10 };

      cy.getElementById('pkg:web').data('boxFrame', shifted);

      const { frameError } = firstTitleOf(cy, ORIGIN);

      expect(frameError).toBeCloseTo(10, 2);
    });

    // Headless Cytoscape measures no font, so the label's bounds collapse to the model origin (0, 0) and the title error
    // is the larger gap from there to the placeholder corner, (65, 51) here. Only the e2e rows bound the real title error.
    it('WHEN the titles are probed THEN the title error is the 65 px gap across to the placeholder corner', () => {
      const { titleError } = firstTitleOf(cy, ORIGIN);

      expect(titleError).toBeCloseTo(65, 2);
    });

    it('WHEN its frame data puts the placeholder corner at (0, -80) THEN the title error is the 80 px gap down to it', () => {
      const lifted: BoxFrame = { ...WEB_FRAME, titleX: -100, titleY: -180 };

      cy.getElementById('pkg:web').data('boxFrame', lifted);

      const { titleError } = firstTitleOf(cy, ORIGIN);

      expect(titleError).toBeCloseTo(80, 2);
    });

    it('WHEN the frame class is dropped THEN pkg:web is not framed and has no frame errors', () => {
      cy.getElementById('pkg:web').removeClass(BOX_FRAMED_CLASS);

      const { isFramed, frameError, titleError } = firstTitleOf(cy, ORIGIN);

      expect([isFramed, frameError, titleError]).toStrictEqual([false, null, null]);
    });
  });
});
