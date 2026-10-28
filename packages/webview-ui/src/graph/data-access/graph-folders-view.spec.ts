import type { Core, EventObject } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { setGhosts } from './graph-ghosts.ts';
import { showOnly } from './graph-visibility.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { GhostMarks } from '../common/ghost.type.ts';
import type { FoldersView } from '../common/graph-page.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import type { Paint } from '../common/paint.type.ts';
import { boardsCyMock, groupedCyMock } from '../test/mocks/folder-boards.mock.ts';
import { PROTO_EDGES_STUB, PROTO_GROUPS_STUB, PROTO_POSITIONS_STUB } from '../test/stubs/folder-boards.stub.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { collapsedIdOf, folderIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';
import { folderSceneOf } from '../utils/folder-scene.util.ts';

const CONFIG = '@acme/config';

const UI = '@acme/ui';

const UTILS = '@acme/utils';

const APPS_NODE = collapsedIdOf('apps');

const APPS_TO_UI = folderLinkIdOf(APPS_NODE, UI);

const APPS_TO_UTILS = folderLinkIdOf(APPS_NODE, UTILS);

const BOARDS_NAMES = ['docs', 'web', CONFIG, UI, UTILS];

const FOLDER_IDS = [APPS_NODE, APPS_TO_UI, APPS_TO_UTILS];

const WEB_TO_UI = edgeIdOf({ source: 'web', target: UI });

const UI_TO_UTILS = edgeIdOf({ source: UI, target: UTILS });

const UI_TO_UTILS_EDGE: GraphEdge = { source: UI, target: UTILS };

const WITHOUT_UTILS = new Set(['docs', 'web', CONFIG, UI]);

const UTILS_GHOST: GhostMarks = { nodes: [UTILS], edges: [UI_TO_UTILS_EDGE] };

const NO_GHOSTS: GhostMarks = { nodes: [], edges: [] };

const labelOf = (folder: string): string => `L:${folder}`;

const normal = (): ProbeState => 'normal';

const boxDimmedIfPackages = (folder: string): ProbeState => (folder === 'packages' ? 'dimmed' : 'normal');

const LIT_PAINT: Paint = {
  nodeState: normal,
  edgeState: normal,
  boxState: boxDimmedIfPackages,
  collapsedState: (): ProbeState => 'highlighted',
  folderLinkState: (): ProbeState => 'highlighted'
};

const NORMAL_PAINT: Paint = { ...LIT_PAINT, boxState: normal, collapsedState: normal, folderLinkState: normal };

const FOLDER_CLASSES = '.folder-node, .folder-link, .folder-hidden, .box-collapsed';

describe('FEATURE: createFoldersView', () => {
  let cy: Core;
  let view: FoldersView;

  beforeEach(() => {
    cy = boardsCyMock();
    view = createFoldersView(cy);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN apps is collapsed', () => {
    beforeEach(() => {
      view.show(boardsSceneOf(['apps']), labelOf);
    });

    it('THEN its box is hidden and classed collapsed', () => {
      const box = cy.getElementById(folderIdOf('apps'));

      expect(box.classes()).toStrictEqual(['folder-hidden', 'box-collapsed']);
      expect(box.visible()).toBe(false);
    });

    it('THEN its packages are not visible while the packages of packages are', () => {
      const shown = BOARDS_NAMES.map((name: string): boolean => cy.getElementById(name).visible());

      expect(shown).toStrictEqual([false, false, true, true, true]);
    });

    it("THEN a collapsed node sits on the packages' centre, labelled, 220 by 56 and not grabbable", () => {
      const node = cy.getElementById(APPS_NODE);

      expect(node.position()).toStrictEqual({ x: 60, y: 0 });
      expect(node.data('label')).toBe('L:apps');
      expect([node.width(), node.height()]).toStrictEqual([220, 56]);
      expect(node.grabbable()).toBe(false);
      expect(node.hasClass('folder-node')).toBe(true);
    });

    it('THEN one folder link per drawn pair carries its link count', () => {
      const toUi = cy.getElementById(APPS_TO_UI);
      const toUtils = cy.getElementById(APPS_TO_UTILS);

      expect([toUi.data('label'), toUi.data('count')]).toStrictEqual(['2 links', 2]);
      expect([toUtils.data('label'), toUtils.data('count')]).toStrictEqual(['1 link', 1]);
      expect(cy.edges('.folder-link')).toHaveLength(2);
    });

    it('THEN the package link web to ui is hidden while ui to utils is visible', () => {
      const webToUi = cy.getElementById(WEB_TO_UI);

      expect(webToUi.hasClass('folder-hidden')).toBe(true);
      expect(webToUi.visible()).toBe(false);
      expect(cy.getElementById(UI_TO_UTILS).visible()).toBe(true);
    });

    it('WHEN the pass runs again THEN no element is added, removed or reclassed, so Cytoscape restyles none', () => {
      const events: string[] = [];

      cy.on('add remove class', (event: EventObject): void => {
        events.push(event.type);
      });

      view.show(boardsSceneOf(['apps']), labelOf);

      expect(events).toStrictEqual([]);
    });

    it('WHEN nothing is collapsed any more THEN the collapsed node, folder links and classes are gone', () => {
      view.show(boardsSceneOf([]), labelOf);

      expect(cy.elements(FOLDER_CLASSES)).toHaveLength(0);
      expect(cy.getElementById('web').visible()).toBe(true);
    });

    it('WHEN the scene is null THEN the collapsed node, folder links and classes are gone', () => {
      view.show(null, labelOf);

      expect(cy.elements(FOLDER_CLASSES)).toHaveLength(0);
      expect(cy.getElementById(WEB_TO_UI).visible()).toBe(true);
    });

    it('WHEN apps opens with none of its packages shown THEN its box is only hidden, no longer classed collapsed', () => {
      const packagesOnly = [CONFIG, UI, UTILS];

      showOnly(cy, new Set(packagesOnly));
      view.show(boardsSceneOf([], packagesOnly), labelOf);

      expect(cy.getElementById(folderIdOf('apps')).classes()).toStrictEqual(['folder-hidden']);
    });

    it('WHEN docs moves to 0, 200 and the view re-centres THEN the collapsed node is at 60, 100', () => {
      cy.getElementById('docs').position({ x: 0, y: 200 });

      view.recentre();

      expect(cy.getElementById(APPS_NODE).position()).toStrictEqual({ x: 60, y: 100 });
    });
  });

  describe('GIVEN apps is collapsed with docs hidden by the filters', () => {
    it('WHEN docs moves to 0, 200 and the view re-centres THEN the hidden docs still counts', () => {
      const visible = new Set(['web', CONFIG, UI, UTILS]);

      showOnly(cy, visible);
      view.show(boardsSceneOf(['apps'], [...visible]), labelOf);
      cy.getElementById('docs').position({ x: 0, y: 200 });

      view.recentre();

      expect(cy.getElementById(APPS_NODE).position()).toStrictEqual({ x: 60, y: 100 });
    });
  });

  describe('GIVEN a scene whose shown folders lack apps', () => {
    const packagesOnly = [CONFIG, UI, UTILS];

    beforeEach(() => {
      showOnly(cy, new Set(packagesOnly));
    });

    it('WHEN apps is collapsed THEN its box is hidden and no collapsed node is drawn', () => {
      view.show(boardsSceneOf(['apps'], packagesOnly), labelOf);

      expect(cy.getElementById(folderIdOf('apps')).hasClass('folder-hidden')).toBe(true);
      expect(cy.getElementById(APPS_NODE).empty()).toBe(true);
    });

    it('WHEN nothing is collapsed THEN the apps box is hidden and the packages box is not', () => {
      view.show(boardsSceneOf([], packagesOnly), labelOf);

      expect(cy.getElementById(folderIdOf('apps')).hasClass('folder-hidden')).toBe(true);
      expect(cy.getElementById(folderIdOf('packages')).classes()).toStrictEqual([]);
    });
  });

  describe('GIVEN apps is collapsed and the trace ghosts @acme/utils (ghosts, pass, ghost reset, pass)', () => {
    const steps: (() => void)[] = [
      (): void => setGhosts(cy, UTILS_GHOST, WITHOUT_UTILS),
      (): void => view.show(boardsSceneOf(['apps'], [...WITHOUT_UTILS], [UTILS]), labelOf),
      (): void => setGhosts(cy, NO_GHOSTS, WITHOUT_UTILS),
      (): void => view.show(boardsSceneOf(['apps'], [...WITHOUT_UTILS]), labelOf)
    ];
    const runUpTo = (count: number): void => {
      for (const step of steps.slice(0, count)) step();
    };
    const rows = [
      { count: 1, isGhostShown: true },
      { count: 2, isGhostShown: true },
      { count: 3, isGhostShown: false },
      { count: 4, isGhostShown: false }
    ];

    beforeEach(() => {
      showOnly(cy, WITHOUT_UTILS);
      view.show(boardsSceneOf(['apps'], [...WITHOUT_UTILS]), labelOf);
    });

    it.each(rows)('WHEN step $count has run THEN the collapsed node stays and web to ui stays hidden', ({ count }) => {
      runUpTo(count);

      const webToUi = cy.getElementById(WEB_TO_UI);

      expect(cy.getElementById(APPS_NODE).nonempty()).toBe(true);
      expect(webToUi.hasClass('folder-hidden')).toBe(true);
      expect(webToUi.visible()).toBe(false);
      expect(cy.getElementById('web').visible()).toBe(false);
    });

    it.each(rows)('WHEN step $count has run THEN the ghost @acme/utils is shown only while ghosted', ({ count, isGhostShown }) => {
      runUpTo(count);

      expect(cy.getElementById(UTILS).visible()).toBe(isGhostShown);
    });
  });

  describe('GIVEN apps is collapsed and painted with packages dimmed, apps and folder links highlighted', () => {
    beforeEach(() => {
      view.show(boardsSceneOf(['apps']), labelOf);
      view.paint(LIT_PAINT);
    });

    it('THEN the packages box has dimmed-box, never dimmed', () => {
      const box = cy.getElementById(folderIdOf('packages'));

      expect(box.hasClass('dimmed-box')).toBe(true);
      expect(box.hasClass('dimmed')).toBe(false);
    });

    it('THEN a package inside the dimmed box keeps its full effective opacity', () => {
      expect(cy.getElementById(UI).effectiveOpacity()).toBe(1);
    });

    it('THEN the collapsed node and both folder links are highlighted', () => {
      const lit = FOLDER_IDS.map((id: string): boolean => cy.getElementById(id).hasClass('highlighted'));

      expect(lit).toStrictEqual([true, true, true]);
    });

    it('WHEN the pass runs again THEN the new collapsed node and folder links get the last paint', () => {
      view.show(boardsSceneOf(['apps']), labelOf);

      const lit = FOLDER_IDS.map((id: string): boolean => cy.getElementById(id).hasClass('highlighted'));

      expect(lit).toStrictEqual([true, true, true]);
    });

    it('WHEN the same paint is applied again THEN no box, collapsed node or folder link is reclassed', () => {
      let classEvents = 0;

      cy.on('class', (): void => {
        classEvents += 1;
      });

      view.paint(LIT_PAINT);

      expect(classEvents).toBe(0);
    });

    it('WHEN a normal paint follows THEN the box loses dimmed-box and the collapsed node is normal', () => {
      view.paint(NORMAL_PAINT);

      expect(cy.getElementById(folderIdOf('packages')).classes()).toStrictEqual(['normal']);
      expect(cy.getElementById(APPS_NODE).classes()).toStrictEqual(['folder-node', 'normal']);
    });
  });

  describe('GIVEN a folder __proto__ holding a package constructor that depends on x in libs', () => {
    beforeEach(() => {
      cy.destroy();
      cy = groupedCyMock(PROTO_GROUPS_STUB, PROTO_EDGES_STUB, PROTO_POSITIONS_STUB);
      view = createFoldersView(cy);
    });

    it('WHEN __proto__ is collapsed THEN its box hides and its collapsed node links to x', () => {
      const infos = PROTO_GROUPS_STUB.flatMap((group) => group.packages);
      const names = new Set(['constructor', 'x']);
      const scene = folderSceneOf(infos, PROTO_EDGES_STUB, new Set(['__proto__']), names, new Set());

      view.show(scene, labelOf);

      const node = cy.getElementById(collapsedIdOf('__proto__'));
      const link = cy.getElementById(folderLinkIdOf(collapsedIdOf('__proto__'), 'x'));

      expect(cy.getElementById(folderIdOf('__proto__')).hasClass('folder-hidden')).toBe(true);
      expect(node.position()).toStrictEqual({ x: 10, y: 20 });
      expect(link.data('label')).toBe('1 link');
    });
  });

  describe('GIVEN both folders are collapsed', () => {
    it('THEN one folder link joins the two collapsed nodes with 3 links', () => {
      view.show(boardsSceneOf(['apps', 'packages']), labelOf);

      const link = cy.getElementById(folderLinkIdOf(APPS_NODE, collapsedIdOf('packages')));

      expect(link.data('label')).toBe('3 links');
      expect(cy.nodes('.folder-node')).toHaveLength(2);
    });
  });
});
