import type { Core, NodeSingular } from 'cytoscape';
import { beforeEach, describe, expect, it } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { widgetRectsOf } from './graph-rects.ts';
import { showOnly } from './graph-visibility.ts';
import { FOLDER_HIDDEN_CLASS, FOLDER_NODE_CLASS, FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { FolderRect, RectPx } from '../common/widget.type.ts';
import { boardsCyMock, groupedCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { PROTO_EDGES_STUB, PROTO_GROUPS_STUB, PROTO_POSITIONS_STUB } from '../test/stubs/folder-boards.stub.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { BOARDS_NAMES } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf, folderIdOf } from '../utils/folder-id.util.ts';

const renderedRectOf = (node: NodeSingular): RectPx => {
  const box = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
  const rect: RectPx = { x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2 };

  return rect;
};

const addCollapsed = (cy: Core, folder: string): void => {
  const data = { id: collapsedIdOf(folder), width: 180, height: 56 };
  const position = { x: 600, y: 600 };

  cy.add({ data, position, classes: FOLDER_NODE_CLASS });
};

const NO_RECT: RectPx = { x1: Number.NaN, y1: Number.NaN, x2: Number.NaN, y2: Number.NaN };

/** NaN edges and width in place of a missing apps box, so its rect never widens. */
const NO_FOLDER: FolderRect = { rect: NO_RECT, width: Number.NaN };

const appsOf = (cy: Core): FolderRect => widgetRectsOf(cy, null).boxes.get('apps') ?? NO_FOLDER;

describe('FEATURE: widgetRectsOf', () => {
  describe('GIVEN the boards drawn grouped at zoom 0.5', () => {
    let cy: Core;

    beforeEach(() => {
      cy = boardsCyMock();
      cy.zoom(0.5);
    });

    it('WHEN read THEN the apps box rect is its rendered bounding box', () => {
      const expected = renderedRectOf(cy.getElementById(folderIdOf('apps')));

      const rects = widgetRectsOf(cy, null);

      expect(rects.boxes.get('apps')?.rect).toStrictEqual(expected);
    });

    it('WHEN read THEN the apps width is its body and 32 px padding each side, drawn at the zoom, without its border', () => {
      const box = cy.getElementById(folderIdOf('apps'));
      const expected = (box.width() + 2 * FOLDER_PADDING_PX) * 0.5;

      const rects = widgetRectsOf(cy, null);

      expect(rects.boxes.get('apps')?.width).toBe(expected);
    });

    it.each(['selected', 'highlighted'])('WHEN the apps box is painted %s THEN its rect widens but its width stays', (state) => {
      const before = appsOf(cy);

      cy.getElementById(folderIdOf('apps')).addClass(state);
      const after = appsOf(cy);

      expect(after.rect.x2).toBeGreaterThan(before.rect.x2);
      expect(after.width).toBe(before.width);
    });

    it('WHEN read THEN the rects carry the camera zoom they were read at', () => {
      const rects = widgetRectsOf(cy, null);

      expect(rects.zoom).toBe(0.5);
    });

    it('WHEN the apps box is hidden by the folder pass THEN it is left out', () => {
      cy.getElementById(folderIdOf('apps')).addClass(FOLDER_HIDDEN_CLASS);

      const rects = widgetRectsOf(cy, null);
      const folders = rects.boxes.keys();

      expect([...folders]).toStrictEqual(['packages']);
    });

    it('WHEN packages is drawn as a collapsed node THEN its rect is under collapsed packages', () => {
      addCollapsed(cy, 'packages');
      const expected = renderedRectOf(cy.getElementById(collapsedIdOf('packages')));

      const rects = widgetRectsOf(cy, null);

      expect(rects.collapsed.get('packages')?.rect).toStrictEqual(expected);
    });

    it.each(['normal', 'selected', 'highlighted'])(
      'WHEN packages is drawn as a collapsed node painted %s THEN its width is 180 px at zoom 0.5, without its border',
      (state) => {
        addCollapsed(cy, 'packages');
        cy.getElementById(collapsedIdOf('packages')).addClass(state);

        const rects = widgetRectsOf(cy, null);

        expect(rects.collapsed.get('packages')?.width).toBe(90);
      }
    );

    it('WHEN web is selected THEN its rendered rect is the selected rect', () => {
      const expected = renderedRectOf(cy.getElementById('web'));

      const rects = widgetRectsOf(cy, 'web');

      expect(rects.selected).toStrictEqual(expected);
    });

    it('WHEN an unknown name is selected THEN the selected rect is null', () => {
      const rects = widgetRectsOf(cy, 'gone');

      expect(rects.selected).toBeNull();
    });

    it('WHEN web is selected but hidden THEN the selected rect is null', () => {
      const visible = new Set(BOARDS_NAMES.filter((name): boolean => name !== 'web'));

      showOnly(cy, visible);

      const rects = widgetRectsOf(cy, 'web');

      expect(rects.selected).toBeNull();
    });
  });

  describe('GIVEN boxes for the root folder and a package named __proto__', () => {
    let cy: Core;

    beforeEach(() => {
      cy = boxedCyMock();
      setBoxes(cy, BOX_GROUPS_STUB);
    });

    it('WHEN read THEN the root box keys as the empty folder', () => {
      const rects = widgetRectsOf(cy, null);

      expect(rects.boxes.has('')).toBe(true);
    });

    it('WHEN __proto__ is selected THEN its rect resolves', () => {
      const expected = renderedRectOf(cy.getElementById('__proto__'));

      const rects = widgetRectsOf(cy, '__proto__');

      expect(rects.selected).toStrictEqual(expected);
    });
  });

  describe('GIVEN a folder __proto__ holding a package named constructor', () => {
    let cy: Core;

    beforeEach(() => {
      cy = groupedCyMock(PROTO_GROUPS_STUB, PROTO_EDGES_STUB, PROTO_POSITIONS_STUB);
    });

    it('WHEN read THEN the __proto__ box keys as __proto__', () => {
      const rects = widgetRectsOf(cy, null);

      expect(new Set(rects.boxes.keys())).toStrictEqual(new Set(['__proto__', 'libs']));
    });

    it('WHEN constructor is selected THEN its rect resolves', () => {
      const expected = renderedRectOf(cy.getElementById('constructor'));

      const rects = widgetRectsOf(cy, 'constructor');

      expect(rects.selected).toStrictEqual(expected);
    });
  });
});
