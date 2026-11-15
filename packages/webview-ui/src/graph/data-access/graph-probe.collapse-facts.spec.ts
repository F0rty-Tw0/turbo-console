import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { createGraphProbe } from './graph-probe.ts';
import type { GraphPackage, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import type { FoldersView, GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe, ProbeFacts, ProbeFolder, ProbeNode, ProbeState } from '../common/graph-probe.type.ts';
import type { Paint } from '../common/paint.type.ts';
import { boardsCyMock, groupedCyMock } from '../test/mocks/folder-boards.mock.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { BOARDS_NAMES, boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const GHOST_CLASSES = 'highlighted ghost';

const nodeOf = (probe: GraphProbe, id: string): ProbeNode | undefined => {
  const isId = (node: ProbeNode): boolean => node.id === id;

  return probe.nodes().find(isId);
};

describe('FEATURE: createGraphProbe collapse facts', () => {
  const OPTIONS = { includeLabels: false, includeOverlays: false };
  const UI = '@acme/ui';
  const labelOf = (folder: string): string => folder;
  const normal = (): ProbeState => 'normal';
  const LIT_PAINT: Paint = {
    nodeState: normal,
    edgeState: normal,
    boxState: (folder: string): ProbeState => (folder === 'packages' ? 'dimmed' : 'normal'),
    collapsedState: (): ProbeState => 'highlighted',
    folderLinkState: normal
  };
  let cy: Core;
  let folders: FoldersView;
  let probe: GraphProbe;

  const folderOf = (key: string): ProbeFolder | undefined =>
    probe.folders().find((folder: ProbeFolder): boolean => folder.folder === key);

  beforeEach(() => {
    cy = boardsCyMock();
    folders = createFoldersView(cy);

    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };
    const facts: ProbeFacts = { ...GRAPH_PROBE_STUB, toggleMs: (): number => 40 };

    probe = createGraphProbe(view, facts);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the facts', () => {
    it('WHEN the toggle time is read THEN it is passed through', () => {
      expect(probe.toggleMs()).toBe(40);
    });
  });

  describe('GIVEN apps collapsed', () => {
    beforeEach(() => {
      folders.show(boardsSceneOf(['apps']), labelOf);
    });

    it('WHEN the nodes are read THEN they are the five packages, no collapsed node', () => {
      const ids = probe.nodes().map((node: ProbeNode): string => node.id);

      expect(ids).toStrictEqual(BOARDS_NAMES);
    });

    it('WHEN web is read THEN it is visible in the filter sense and collapsed', () => {
      expect(nodeOf(probe, 'web')).toMatchObject({ isVisible: true, isCollapsed: true });
    });

    it('WHEN ui is read THEN it is visible and not collapsed', () => {
      expect(nodeOf(probe, UI)).toMatchObject({ isVisible: true, isCollapsed: false });
    });

    it('WHEN the visible ids are read THEN docs and web stay in', () => {
      expect(probe.visibleIds()).toStrictEqual(['@acme/config', '@acme/ui', '@acme/utils', 'docs', 'web']);
    });

    it("WHEN the folders are read THEN apps is collapsed, visible and listed with the collapsed node's state and rect", () => {
      folders.paint(LIT_PAINT);

      const { x1, x2, y1, y2 } = cy.getElementById(collapsedIdOf('apps')).renderedBoundingBox(OPTIONS);
      const apps = folderOf('apps');

      expect(apps).toMatchObject({ isCollapsed: true, isVisible: true, state: 'highlighted', packages: ['docs', 'web'] });
      expect(apps).toMatchObject({
        renderedX: (x1 + x2) / 2,
        renderedY: (y1 + y2) / 2,
        renderedWidth: x2 - x1,
        renderedHeight: y2 - y1
      });
    });

    it('WHEN the boxes are painted THEN packages reads its dimmed box as dimmed, expanded and visible', () => {
      folders.paint(LIT_PAINT);

      expect(folderOf('packages')).toMatchObject({ isCollapsed: false, isVisible: true, state: 'dimmed' });
    });

    it('WHEN the boxes are painted THEN ui inside the dimmed box keeps opacity 1', () => {
      folders.paint(LIT_PAINT);

      expect(nodeOf(probe, UI)?.effectiveOpacity).toBe(1);
    });

    it('WHEN the folder links are read THEN their ends read the folder key and the package name', () => {
      const links = probe.folderLinks();

      expect(links).toMatchObject([
        { source: 'apps', target: UI, count: 2, isDrawn: true, state: 'normal' },
        { source: 'apps', target: '@acme/utils', count: 1, isDrawn: true, state: 'normal' }
      ]);
    });
  });

  describe('GIVEN config hidden by a bypass and utils drawn as a ghost', () => {
    beforeEach(() => {
      cy.getElementById('@acme/config').style('display', 'none');
      cy.getElementById('@acme/utils').addClass(GHOST_CLASSES);
    });

    it('WHEN the visible ids are read THEN both are left out and the rest sorted', () => {
      expect(probe.visibleIds()).toStrictEqual(['@acme/ui', 'docs', 'web']);
    });

    it('WHEN the nodes are read THEN neither is visible', () => {
      const flags = [nodeOf(probe, '@acme/config')?.isVisible, nodeOf(probe, '@acme/utils')?.isVisible];

      expect(flags).toStrictEqual([false, false]);
    });
  });

  describe('GIVEN only the packages of packages visible', () => {
    const PACKAGES_ONLY = ['@acme/config', UI, '@acme/utils'];

    it('WHEN apps is expanded THEN its box reads not visible', () => {
      folders.show(boardsSceneOf([], PACKAGES_ONLY), labelOf);

      expect(folderOf('apps')).toMatchObject({ isCollapsed: false, isVisible: false });
    });

    it('WHEN apps is collapsed THEN it reads not visible with an empty rect', () => {
      folders.show(boardsSceneOf(['apps'], PACKAGES_ONLY), labelOf);

      expect(folderOf('apps')).toMatchObject({ isCollapsed: true, isVisible: false, renderedWidth: 0, renderedHeight: 0, width: 0 });
    });
  });

  describe("GIVEN a root folder and a real '(root)' folder", () => {
    it('WHEN the folders are read THEN their keys differ', () => {
      const solo: GraphPackage = { name: 'solo', bareName: 'solo', path: 'solo', tags: [], taskCount: 0 };
      const x: GraphPackage = { name: 'x', bareName: 'x', path: '(root)/x', tags: [], taskCount: 0 };
      const rootGroup: FolderGroup = { folder: '', packages: [solo] };
      const realGroup: FolderGroup = { folder: '(root)', packages: [x] };
      const soloAt: Position = { x: 0, y: 0 };
      const xAt: Position = { x: 300, y: 0 };
      const positions: Positions = { solo: soloAt, x: xAt };

      cy.destroy();
      cy = groupedCyMock([rootGroup, realGroup], [], positions);

      expect(probe.folders().map((folder: ProbeFolder): string => folder.folder)).toStrictEqual(['', '(root)']);
    });
  });
});
