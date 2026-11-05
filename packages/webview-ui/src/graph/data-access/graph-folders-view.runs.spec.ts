import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import type { FoldersView, PackageRuns } from '../common/graph-page.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { classesOf } from '../test/utils/run-marks.spec.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const APPS_NODE = collapsedIdOf('apps');

const PACKAGES_NODE = collapsedIdOf('packages');

const labelOf = (folder: string): string => `L:${folder}`;

const runsOf = (name: string, state: GraphRunState): PackageRuns => new Map([[name, state]]);

describe('FEATURE: createFoldersView run marks', () => {
  let cy: Core;
  let view: FoldersView;

  beforeEach(() => {
    cy = boardsCyMock();
    view = createFoldersView(cy);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the boards graph with apps collapsed and web running', () => {
    beforeEach(() => {
      view.show(boardsSceneOf(['apps']), labelOf);
    });

    it('WHEN markRuns is called THEN the apps collapsed node reads run-running', () => {
      view.markRuns(runsOf('web', 'running'));

      expect(classesOf(cy, APPS_NODE)).toStrictEqual(['run-running', 'package-run']);
    });

    it('WHEN apps is expanded and collapsed again by show THEN the new apps node reads run-running', () => {
      view.markRuns(runsOf('web', 'running'));
      view.show(boardsSceneOf([]), labelOf);
      view.show(boardsSceneOf(['apps']), labelOf);

      expect(classesOf(cy, APPS_NODE)).toStrictEqual(['run-running', 'package-run']);
    });

    it('WHEN the runs turn empty THEN the apps node has no run class', () => {
      view.markRuns(runsOf('web', 'running'));
      view.markRuns(new Map());

      expect(classesOf(cy, APPS_NODE)).toStrictEqual([]);
    });
  });

  describe('GIVEN markRuns was called with ui running before any folder was collapsed', () => {
    beforeEach(() => {
      view.markRuns(runsOf('@acme/ui', 'running'));
    });

    it('WHEN packages are collapsed by show THEN the packages node is marked from the same runs', () => {
      view.show(boardsSceneOf(['packages']), labelOf);

      expect(classesOf(cy, PACKAGES_NODE)).toStrictEqual(['run-running', 'package-run']);
    });
  });
});
