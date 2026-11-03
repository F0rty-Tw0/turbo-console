import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { probeFolderLinksOf, probeFoldersOf } from './graph-probe-folders.ts';
import { graphStyleOf } from './graph-style.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeFolder, ProbeRect } from '../common/graph-probe.type.ts';
import { ROW_LESS_CLASS } from '../common/graph.const.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const labelOf = (folder: string): string => `${folder}\n2 packages`;

describe('FEATURE: probeFoldersOf drawn label', () => {
  describe('GIVEN the boards styled with apps collapsed', () => {
    let cy: Core;

    const textOf = (folder: string): string | undefined =>
      probeFoldersOf(cy, ORIGIN).find((probed): boolean => probed.folder === folder)?.text;

    beforeEach(() => {
      cy = boardsCyMock();
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
      createFoldersView(cy).show(boardsSceneOf(['apps']), labelOf);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN its collapsed node shows its row THEN apps reads no drawn label', () => {
      expect(textOf('apps')).toBe('');
    });

    it('WHEN its collapsed node is row-less THEN apps reads the label the canvas draws', () => {
      cy.getElementById(collapsedIdOf('apps')).addClass(ROW_LESS_CLASS);

      expect(textOf('apps')).toBe('apps\n2 packages');
    });
  });
});

/** The label box of the first folder link of `cy`. */
const labelBoxOf = (cy: Core, origin: Position): ProbeRect => {
  const [first] = probeFolderLinksOf(cy, origin);

  if (first === undefined) throw new Error('no folder link is drawn');

  return first.labelBox;
};

describe('FEATURE: probeFolderLinksOf label box', () => {
  describe('GIVEN the boards styled with apps collapsed', () => {
    let cy: Core;

    beforeEach(() => {
      cy = boardsCyMock();
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
      createFoldersView(cy).show(boardsSceneOf(['apps']), labelOf);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN the container sits 10 px right of and 20 px below the page corner THEN the label box moves with it', () => {
      const atCorner = labelBoxOf(cy, ORIGIN);
      const moved = labelBoxOf(cy, { x: 10, y: 20 });

      expect(moved).toStrictEqual({ ...atCorner, left: atCorner.left + 10, top: atCorner.top + 20 });
    });
  });
});

/** The task folder box `apps`, its id spelled with U+0001 by code point. */
const APPS_ID = `${String.fromCodePoint(1)}apps`;

const APPS_DATA = { id: APPS_ID, title: 'apps' };

const WEB_DATA = { id: 'pkg:web', parent: APPS_ID, title: 'web' };

const SCRIPTS_DATA = { id: 'scripts:web', parent: 'pkg:web', title: 'Scripts' };

const BUILD_DATA = { id: 'web#build', parent: 'pkg:web', width: 80, height: 32 };

const DEV_DATA = { id: 'web#dev', parent: 'scripts:web', width: 80, height: 32 };

/** `apps` holds `pkg:web`, which holds the turbo task `web#build` and `scripts:web`, which holds the script `web#dev`. */
const TASK_BOXES: ElementDefinition[] = [
  { data: APPS_DATA },
  { data: WEB_DATA },
  { data: SCRIPTS_DATA },
  { data: BUILD_DATA },
  { data: DEV_DATA }
];

type FolderMembers = Pick<ProbeFolder, 'folder' | 'packages'>;

const membersOf = (probed: ProbeFolder): FolderMembers => {
  const members: FolderMembers = { folder: probed.folder, packages: probed.packages };

  return members;
};

describe('FEATURE: probeFoldersOf on the task canvas', () => {
  describe('GIVEN a task folder box around a package box with a Scripts box', () => {
    let cy: Core;

    beforeEach(() => {
      const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

      cy = cytoscape({ headless: true, styleEnabled: true, elements: TASK_BOXES, style });
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN the folders are probed THEN only the folder box is listed, holding pkg:web', () => {
      const folders = probeFoldersOf(cy, ORIGIN).map(membersOf);

      expect(folders).toStrictEqual([{ folder: 'apps', packages: ['pkg:web'] }]);
    });

    it('WHEN the folders are probed THEN the folder reads the resolved text-max-width of its box', () => {
      const [apps] = probeFoldersOf(cy, ORIGIN);
      const resolved: unknown = cy.getElementById(APPS_ID).numericStyle('text-max-width');

      expect([apps?.textMaxWidth, resolved]).toStrictEqual([resolved, expect.any(Number)]);
      expect(apps?.textMaxWidth).toBeGreaterThan(0);
    });

    it('WHEN the canvas is zoomed to 2 and the folders are probed THEN the folder reads the model width of its box, not the zoomed one', () => {
      cy.zoom(2);
      const modelWidth = cy.getElementById(APPS_ID).width();

      const [apps] = probeFoldersOf(cy, ORIGIN);

      expect(apps?.width).toBe(modelWidth);
    });
  });
});
