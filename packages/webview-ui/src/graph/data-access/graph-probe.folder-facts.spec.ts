import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { createGraphProbe } from './graph-probe.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe, ProbeEdge, ProbeFolder, ProbeNode } from '../common/graph-probe.type.ts';
import { boxedCyMock, containerAtMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { folderLinkIdOf } from '../utils/folder-id.util.ts';

const nodeOf = (probe: GraphProbe, id: string): ProbeNode | undefined => {
  const isId = (node: ProbeNode): boolean => node.id === id;

  return probe.nodes().find(isId);
};

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
