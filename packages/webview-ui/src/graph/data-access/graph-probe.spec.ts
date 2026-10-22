/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle -- the probe's window names are the e2e contract */

import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { createFoldersView } from './graph-folders-view.ts';
import { createGraphProbe, exposeProbe } from './graph-probe.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphPackage, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import type { FoldersView, GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe, ProbeEdge, ProbeFacts, ProbeFolder, ProbeHost, ProbeNode, ProbeState } from '../common/graph-probe.type.ts';
import type { Paint } from '../common/paint.type.ts';
import { boardsCyMock, groupedCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boxedCyMock, containerAtMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { CANVAS_COLORS, canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { BOARDS_NAMES, boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';

const GHOST_CLASSES = 'highlighted ghost';

const ELEMENTS: ElementDefinition[] = [
  canvasNodeOf('a'),
  canvasNodeOf('b'),
  canvasNodeOf('c'),
  canvasEdgeOf('a', 'b'),
  canvasEdgeOf('b', 'c'),
  canvasEdgeOf('a', 'c')
];

const nodeOf = (probe: GraphProbe, id: string): ProbeNode | undefined => {
  const isId = (node: ProbeNode): boolean => node.id === id;

  return probe.nodes().find(isId);
};

const edgeOf = (probe: GraphProbe, source: string, target: string): ProbeEdge | undefined => {
  const isEnds = (edge: ProbeEdge): boolean => edge.source === source && edge.target === target;

  return probe.edges().find(isEnds);
};

describe('FEATURE: exposeProbe', () => {
  it.each([
    ['no flag', {}],
    ["the string 'true'", { __tcGraphProbeWanted: 'true' }],
    ['the number 1', { __tcGraphProbeWanted: 1 }]
  ])('GIVEN %s WHEN the probe is offered THEN none is exposed', (_name, host: ProbeHost) => {
    exposeProbe(host, GRAPH_PROBE_STUB);

    expect(host.__tcGraphProbe).toBeUndefined();
  });

  it('GIVEN the flag true WHEN the probe is offered THEN the host holds that probe', () => {
    const host: ProbeHost = { __tcGraphProbeWanted: true };

    exposeProbe(host, GRAPH_PROBE_STUB);

    const exposed: GraphProbe | undefined = host.__tcGraphProbe;

    expect(exposed).toBe(GRAPH_PROBE_STUB);
  });
});

describe('FEATURE: createGraphProbe ghost facts', () => {
  let cy: Core;
  let probe: GraphProbe;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
    cy.getElementById('b').addClass(GHOST_CLASSES);
    cy.getElementById('b').connectedEdges().addClass(GHOST_CLASSES);

    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };

    probe = createGraphProbe(view, GRAPH_PROBE_STUB);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN b drawn as a ghost on the path a, b, c', () => {
    it('WHEN the nodes are read THEN b is a highlighted ghost with a dashed border', () => {
      const node = nodeOf(probe, 'b');

      expect(node).toMatchObject({ isGhost: true, state: 'highlighted', borderStyle: 'dashed' });
    });

    it('WHEN the nodes are read THEN a is no ghost and has a solid border', () => {
      const node = nodeOf(probe, 'a');

      expect(node).toMatchObject({ isGhost: false, borderStyle: 'solid' });
    });

    it('WHEN the edges are read THEN a to b is a drawn dashed ghost', () => {
      const edge = edgeOf(probe, 'a', 'b');

      expect(edge).toMatchObject({ isGhost: true, isDrawn: true, lineStyle: 'dashed' });
    });

    it('WHEN the edges are read THEN a to c is a drawn solid link', () => {
      const edge = edgeOf(probe, 'a', 'c');

      expect(edge).toMatchObject({ isGhost: false, isDrawn: true, lineStyle: 'solid' });
    });

    it('WHEN b gets a display none bypass THEN a to b is not drawn', () => {
      cy.getElementById('b').style('display', 'none');

      const edge = edgeOf(probe, 'a', 'b');

      expect(edge).toMatchObject({ isDrawn: false });
    });

    it('WHEN the visible ids are read THEN the ghost is left out', () => {
      const ids = probe.visibleIds();

      expect(ids).toStrictEqual(['a', 'c']);
    });
  });
});

describe('FEATURE: createGraphProbe folder facts', () => {
  const OPTIONS = { includeLabels: false, includeOverlays: false };
  let cy: Core;
  let probe: GraphProbe;

  beforeEach(() => {
    cy = boxedCyMock();

    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };

    probe = createGraphProbe(view, GRAPH_PROBE_STUB);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cy.destroy();
  });

  describe('GIVEN no boxes', () => {
    it('WHEN the folders are read THEN there are none', () => {
      expect(probe.folders()).toStrictEqual([]);
    });
  });

  describe('GIVEN three boxes around the packages', () => {
    beforeEach(() => {
      setBoxes(cy, BOX_GROUPS_STUB);
      cy.getElementById('c').addClass('dimmed');
    });

    it('WHEN the nodes are read THEN they are the five packages, no box', () => {
      const ids = probe.nodes().map((node: ProbeNode): string => node.id);

      expect(ids.sort()).toStrictEqual(['__proto__', 'a', 'b', 'c', 'd']);
    });

    it('WHEN the visible ids are read THEN they are the five packages sorted', () => {
      expect(probe.visibleIds()).toStrictEqual(['__proto__', 'a', 'b', 'c', 'd']);
    });

    it('WHEN the edges are read THEN both links remain', () => {
      expect(probe.edges()).toHaveLength(2);
    });

    it('WHEN a folder link is drawn THEN the edges are still the two package links', () => {
      const data = { id: folderLinkIdOf('a', 'c'), source: 'a', target: 'c' };

      cy.add({ data, classes: 'folder-link' });

      expect(probe.edges().map((edge: ProbeEdge): string => `${edge.source}>${edge.target}`)).toStrictEqual(['a>b', 'b>c']);
    });

    it('WHEN the opacity is read THEN a normal package is 1 and a dimmed one 0.25 inside its unclassed box', () => {
      expect(nodeOf(probe, 'a')?.effectiveOpacity).toBe(1);
      expect(nodeOf(probe, 'c')?.effectiveOpacity).toBe(0.25);
    });

    it('WHEN the folders are read THEN they run root first, then apps, then packages, all normal and expanded', () => {
      const folders = probe.folders();

      expect(folders.map((folder: ProbeFolder): string => folder.folder)).toStrictEqual(['', 'apps', 'packages']);
      expect(folders.map((folder: ProbeFolder): string[] => folder.packages)).toStrictEqual([['d'], ['a', 'b'], ['c']]);

      for (const folder of folders) {
        expect(folder).toMatchObject({ isCollapsed: false, isVisible: true, state: 'normal' });
        expect(folder.renderedWidth).toBeGreaterThan(0);
        expect(folder.renderedHeight).toBeGreaterThan(0);
      }
    });

    it('WHEN b is hidden THEN the apps box still lists a and b', () => {
      cy.getElementById('b').style('display', 'none');

      const apps = probe.folders().find((folder: ProbeFolder): boolean => folder.folder === 'apps');

      expect(apps?.packages).toStrictEqual(['a', 'b']);
    });

    it('WHEN the container sits at 40, 70 THEN each box rect is its rendered box shifted by that origin', () => {
      vi.spyOn(cy, 'container').mockReturnValue(containerAtMock(40, 70));

      for (const folder of probe.folders()) {
        const { x1, x2, y1, y2 } = cy.getElementById(`\u0001${folder.folder}`).renderedBoundingBox(OPTIONS);

        expect(folder.renderedX).toBe(40 + (x1 + x2) / 2);
        expect(folder.renderedY).toBe(70 + (y1 + y2) / 2);
        expect(folder.renderedWidth).toBe(x2 - x1);
        expect(folder.renderedHeight).toBe(y2 - y1);
      }
    });
  });
});

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

  it('GIVEN the facts WHEN the toggle time is read THEN it is passed through', () => {
    expect(probe.toggleMs()).toBe(40);
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

      expect(links).toStrictEqual([
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

      expect(folderOf('apps')).toMatchObject({ isCollapsed: true, isVisible: false, renderedWidth: 0, renderedHeight: 0 });
    });
  });

  it("GIVEN a root folder and a real '(root)' folder WHEN the folders are read THEN their keys differ", () => {
    const solo: GraphPackage = { name: 'solo', path: 'solo', tags: [], taskCount: 0 };
    const x: GraphPackage = { name: 'x', path: '(root)/x', tags: [], taskCount: 0 };
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
