import cytoscape from 'cytoscape';
import type { CollectionReturnValue, Core, EdgeSingular, ElementDefinition, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { createFoldersView } from './graph-folders-view.ts';
import { graphStyleOf } from './graph-style.ts';
import { centreOnNode, fitVisible, framedOf, openViewportOf, showOnly } from './graph-visibility.ts';
import type { GraphPackage, Position } from '../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { CANVAS_RUN_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { styleTextOf } from '../test/utils/folder-boxes.spec.util.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';

const COLORS: ThemeColors = {
  background: '#111',
  label: '#eee',
  edge: '#888',
  selected: '#f00',
  highlighted: '#0f0',
  frame: '#444',
  cached: '#a0f',
  runs: CANVAS_RUN_COLORS,
  selection: null,
  dimmedOpacity: 0.25,
  affected: '#fa0'
};

const PADDING_PX = 24;

const nodeAt = (id: string, x: number, y: number): ElementDefinition => {
  const data = { id };
  const position: Position = { x, y };
  const definition: ElementDefinition = { data, position };

  return definition;
};

const edgeOf = (source: string, target: string): ElementDefinition => {
  const data = { id: `${source}>${target}`, source, target };
  const definition: ElementDefinition = { data };

  return definition;
};

const ELEMENTS: ElementDefinition[] = [
  nodeAt('a', 0, 0),
  nodeAt('b', 100, 0),
  nodeAt('c', 5000, 40),
  nodeAt('__proto__', 7, 7),
  edgeOf('a', 'b'),
  edgeOf('b', 'c')
];

const buildCy = (): Core => cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });

const idOf = (element: NodeSingular | EdgeSingular): string => element.id();

const visibleIds = (cy: Core): string[] => {
  const ids = cy.nodes(':visible').map(idOf);

  return ids.sort();
};

const visibleEdgeIds = (cy: Core): string[] => {
  const ids = cy.edges(':visible').map(idOf);

  return ids.sort();
};

const copyEntryOf = (node: NodeSingular): [string, Position] => {
  const { x, y } = node.position();
  const copy: Position = { x, y };

  return [node.id(), copy];
};

const positionsOf = (cy: Core): [string, Position][] => cy.nodes().map(copyEntryOf);

const ALL_IDS: ReadonlySet<string> = new Set(['a', 'b', 'c', '__proto__']);

const FIVE_IDS = ['a', 'b', 'c', 'd', '__proto__'];

/** The three boxes and the five packages, sorted by code unit. */
const FRAMED_IDS = ['\u0001', '\u0001apps', '\u0001packages', '__proto__', 'a', 'b', 'c', 'd'];

describe('FEATURE: graph visibility', () => {
  let cy: Core;

  beforeEach(() => {
    cy = buildCy();
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a graph of four nodes', () => {
    it('WHEN a and b are shown THEN only a and b are visible', () => {
      showOnly(cy, new Set(['a', 'b']));

      expect(visibleIds(cy)).toStrictEqual(['a', 'b']);
    });

    it('WHEN a and b are shown THEN only the edge between them is visible', () => {
      showOnly(cy, new Set(['a', 'b']));

      expect(visibleEdgeIds(cy)).toStrictEqual(['a>b']);
    });

    it('WHEN a is shown and then every name is shown THEN all four nodes are visible again', () => {
      showOnly(cy, new Set(['a']));
      showOnly(cy, ALL_IDS);

      expect(visibleIds(cy)).toStrictEqual(['__proto__', 'a', 'b', 'c']);
    });

    it('WHEN only a is shown THEN no node moves', () => {
      const before = positionsOf(cy);

      showOnly(cy, new Set(['a']));

      expect(positionsOf(cy)).toStrictEqual(before);
    });

    it('WHEN a is shown and the style and node classes are reapplied THEN only a is visible', () => {
      showOnly(cy, new Set(['a']));
      cy.style(graphStyleOf(COLORS, 'sans-serif', false));
      cy.nodes().forEach((node: NodeSingular): void => void node.classes(['normal']));

      expect(visibleIds(cy)).toStrictEqual(['a']);
    });

    it('WHEN the visible set is empty THEN no node is visible', () => {
      showOnly(cy, new Set());

      expect(visibleIds(cy)).toStrictEqual([]);
    });
  });

  describe('GIVEN a spy on the Cytoscape fit', () => {
    it('WHEN a and b are shown THEN fit receives exactly those nodes and the padding', () => {
      const fit = vi.spyOn(cy, 'fit');

      showOnly(cy, new Set(['a', 'b']));
      fitVisible(cy, PADDING_PX);

      const [shown, padding] = fit.mock.calls[0] ?? [];
      const fitted: CollectionReturnValue = cy.collection().union(shown ?? cy.collection());
      const fittedIds = fitted.nodes().map(idOf).sort();

      expect(fit).toHaveBeenCalledTimes(1);
      expect(fittedIds).toStrictEqual(['a', 'b']);
      expect(padding).toBe(PADDING_PX);
    });

    it('WHEN nothing is shown THEN fit is not called', () => {
      const fit = vi.spyOn(cy, 'fit');

      showOnly(cy, new Set());
      fitVisible(cy, PADDING_PX);

      expect(fit).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a ghost c shown with a and b', () => {
    it('WHEN fitVisible runs THEN fit receives a, b and c', () => {
      const fit = vi.spyOn(cy, 'fit');

      showOnly(cy, new Set(['a', 'b', 'c']));
      cy.getElementById('c').addClass('ghost');
      fitVisible(cy, PADDING_PX);

      const [shown] = fit.mock.calls[0] ?? [];
      const fitted: CollectionReturnValue = cy.collection().union(shown ?? cy.collection());

      expect(fitted.nodes().map(idOf).sort()).toStrictEqual(['a', 'b', 'c']);
    });
  });

  describe('GIVEN only ghost nodes shown', () => {
    it('WHEN fitVisible runs THEN fit receives them', () => {
      const fit = vi.spyOn(cy, 'fit');

      showOnly(cy, new Set(['b', 'c']));
      cy.nodes().addClass('ghost');
      fitVisible(cy, PADDING_PX);

      const [shown] = fit.mock.calls[0] ?? [];
      const fitted: CollectionReturnValue = cy.collection().union(shown ?? cy.collection());

      expect(fitted.nodes().map(idOf).sort()).toStrictEqual(['b', 'c']);
    });
  });

  describe('GIVEN folder boxes around the packages', () => {
    const boxDisplays = (): string[] => {
      const boxIds = cy.nodes(':parent').map(idOf);

      return boxIds.map((id: string): string => styleTextOf(cy, id, 'display'));
    };

    beforeEach(() => {
      cy.destroy();
      cy = boxedCyMock();
      setBoxes(cy, BOX_GROUPS_STUB);
    });

    it('WHEN only a is shown THEN b, c, d and __proto__ are hidden and a is shown', () => {
      showOnly(cy, new Set(['a']));

      const displays = FIVE_IDS.map((id: string): string => styleTextOf(cy, id, 'display'));

      expect(displays).toStrictEqual(['element', 'none', 'none', 'none', 'none']);
    });

    it('WHEN only a is shown THEN every box keeps display element', () => {
      showOnly(cy, new Set(['a']));

      expect(boxDisplays()).toStrictEqual(['element', 'element', 'element']);
    });

    it('WHEN fitVisible runs THEN fit receives the packages and their boxes, whose frames reach past the packages', () => {
      const fit = vi.spyOn(cy, 'fit');

      fitVisible(cy, PADDING_PX);

      const [shown] = fit.mock.calls[0] ?? [];
      const fitted: CollectionReturnValue = cy.collection().union(shown ?? cy.collection());

      expect(fitted.nodes().map(idOf).sort()).toStrictEqual(FRAMED_IDS);
    });

    it('WHEN only a is shown and fitVisible runs THEN fit receives a and the apps box only', () => {
      const fit = vi.spyOn(cy, 'fit');

      showOnly(cy, new Set(['a']));
      fitVisible(cy, PADDING_PX);

      const [shown] = fit.mock.calls[0] ?? [];
      const fitted: CollectionReturnValue = cy.collection().union(shown ?? cy.collection());

      expect(fitted.nodes().map(idOf).sort()).toStrictEqual(['\u0001apps', 'a']);
    });
  });

  describe('GIVEN the boards graph grouped with a spy on the Cytoscape fit', () => {
    const fittedIdsOf = (collapsed: string[]): string[] => {
      const fit = vi.spyOn(cy, 'fit');

      createFoldersView(cy).show(boardsSceneOf(collapsed), (folder: string): string => folder);
      fitVisible(cy, PADDING_PX);

      const [shown] = fit.mock.calls[0] ?? [];
      const fitted: CollectionReturnValue = cy.collection().union(shown ?? cy.collection());

      return fitted.nodes().map(idOf).sort();
    };

    beforeEach(() => {
      cy.destroy();
      cy = boardsCyMock();
    });

    it('WHEN apps is collapsed THEN fit receives its collapsed node and the packages box with its packages, not docs', () => {
      expect(fittedIdsOf(['apps'])).toStrictEqual(['\u0001packages', '\u0002apps', '@acme/config', '@acme/ui', '@acme/utils']);
    });

    it('WHEN every folder is collapsed THEN fit receives the two collapsed nodes', () => {
      expect(fittedIdsOf(['apps', 'packages'])).toStrictEqual(['\u0002apps', '\u0002packages']);
    });
  });

  describe('GIVEN the edges a>b and b>c', () => {
    const fittedEdgeIdsOf = (names: string[]): string[] => {
      const fit = vi.spyOn(cy, 'fit');

      showOnly(cy, new Set(names));
      fitVisible(cy, PADDING_PX);

      const [shown] = fit.mock.calls[0] ?? [];
      const fitted: CollectionReturnValue = cy.collection().union(shown ?? cy.collection());

      return fitted.edges().map(idOf).sort();
    };

    it('WHEN fitted with a and b visible THEN the fitted collection holds a>b', () => {
      expect(fittedEdgeIdsOf(['a', 'b'])).toStrictEqual(['a>b']);
    });

    it('WHEN fitted with b hidden by a filter THEN a>b and b>c are not fitted', () => {
      expect(fittedEdgeIdsOf(['a', 'c'])).toStrictEqual([]);
    });
  });

  describe('GIVEN an apps box over a and b and a docs box above it whose package a filter hid', () => {
    const sizedNodeAt = (id: string, x: number, y: number): ElementDefinition => {
      const data = { id, width: 40, height: 20 };
      const position: Position = { x, y };
      const definition: ElementDefinition = { data, position };

      return definition;
    };
    const groupOf = (folder: string, names: string[]): FolderGroup => {
      const packageOf = (name: string): GraphPackage => {
        const pkg: GraphPackage = { name, bareName: name, path: name, tags: [], taskCount: 0 };

        return pkg;
      };
      const group: FolderGroup = { folder, packages: names.map(packageOf) };

      return group;
    };

    beforeEach(() => {
      const elements = [sizedNodeAt('a', 0, 0), sizedNodeAt('b', 4000, 0), sizedNodeAt('c', 0, -900)];
      const layout = { name: 'preset', fit: false };

      cy.destroy();
      cy = cytoscape({ headless: true, styleEnabled: true, layout, elements });
      cy.style(graphStyleOf(COLORS, 'sans-serif', false));
      setBoxes(cy, [groupOf('apps', ['a', 'b']), groupOf('docs', ['c'])]);
      // A compound's extent is computed lazily: read with c shown, it keeps c's place once c is hidden, as a drawn box does.
      cy.nodes().boundingBox();
      showOnly(cy, new Set(['a', 'b']));
      vi.spyOn(cy, 'width').mockReturnValue(1000);
      vi.spyOn(cy, 'height').mockReturnValue(800);
    });

    it('WHEN the framed collection is read THEN it starts at the apps box, below the docs box that cy.nodes() reaches', () => {
      const appsTop = cy.$id(folderIdOf('apps')).boundingBox().y1;
      const nodesTop = cy.nodes().boundingBox().y1;

      expect(framedOf(cy).boundingBox().y1).toBeCloseTo(appsTop, 6);
      expect(nodesTop).toBeLessThan(appsTop - 800);
    });

    it('WHEN openViewportOf runs THEN zoom is 0.75 and pan.y = 24 - y1 * 0.75, y1 the top of the apps box', () => {
      const appsTop = cy.$id(folderIdOf('apps')).boundingBox().y1;
      const viewport = openViewportOf(cy, PADDING_PX);

      expect(viewport?.zoom).toBe(0.75);
      expect(viewport?.pan.y).toBeCloseTo(PADDING_PX - appsTop * 0.75, 6);
    });
  });

  describe('GIVEN nothing shown', () => {
    it('WHEN openViewportOf runs THEN it is null, the true fit', () => {
      showOnly(cy, new Set());

      expect(openViewportOf(cy, PADDING_PX)).toBeNull();
    });
  });

  describe('GIVEN a zoom of 2', () => {
    it('WHEN c is centred THEN the zoom is kept and c sits at the middle of the view', () => {
      cy.zoom(2);

      centreOnNode(cy, 'c');

      const rendered = cy.getElementById('c').renderedPosition();
      const offsetX = Math.abs(rendered.x - cy.width() / 2);
      const offsetY = Math.abs(rendered.y - cy.height() / 2);

      expect({ zoom: cy.zoom(), offsetX: offsetX < 0.1, offsetY: offsetY < 0.1 }).toStrictEqual({
        zoom: 2,
        offsetX: true,
        offsetY: true
      });
    });
  });

  describe('GIVEN a name that is not in the graph', () => {
    it('WHEN it is centred THEN nothing throws and the pan is unchanged', () => {
      const { x, y } = cy.pan();
      const pan: Position = { x, y };

      expect(() => centreOnNode(cy, 'ghost')).not.toThrow();
      expect(cy.pan()).toStrictEqual(pan);
    });
  });
});
