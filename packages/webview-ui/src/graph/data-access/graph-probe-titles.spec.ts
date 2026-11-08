import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { probeTitlesOf } from './graph-probe-titles.ts';
import { graphStyleOf } from './graph-style.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeRect, ProbeTitle } from '../common/graph-probe-titles.type.ts';
import { TASK_BOX_CLASS, TASK_FOLDER_CLASS } from '../common/graph-task.const.ts';
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

    // Headless Cytoscape measures no font, so the label rect has no height here; the e2e reads real label sizes.
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
  });
});
