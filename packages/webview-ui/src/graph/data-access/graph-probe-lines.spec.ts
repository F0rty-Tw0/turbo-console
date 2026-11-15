import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { edgeLineOf, folderLinkLinesOf } from './graph-probe-lines.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeLineEnd, ProbeLineSource } from '../common/graph-probe-line-source.type.ts';
import type { ProbeEdgeLine } from '../common/graph-probe.type.ts';
import { FOLDER_HIDDEN_CLASS, FOLDER_LINK_CLASS } from '../common/graph.const.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const START: Position = { x: 10, y: 20 };

const BEND_ONE: Position = { x: 10, y: 60 };

const BEND_TWO: Position = { x: 50, y: 60 };

const END: Position = { x: 50, y: 100 };

const MIDDLE: Position = { x: 30, y: 60 };

/** The zoom and the offset a page at (100, 50) panned by (10, 20) reads with. */
const ZOOM = 2;

const OFFSET: Position = { x: 110, y: 70 };

const A_END: ProbeLineEnd = { id: (): string => 'a' };

const B_END: ProbeLineEnd = { id: (): string => 'b' };

const MIDDLE_RENDERED: Position = { x: 170, y: 190 };

type SourceFacts = {
  readonly isVisible: boolean;
  readonly controls: Position[] | undefined;
};

const BENT_FACTS: SourceFacts = { isVisible: true, controls: [BEND_ONE, BEND_TWO] };

const sourceOf = (facts: SourceFacts): ProbeLineSource => {
  const source: ProbeLineSource = {
    source: (): ProbeLineEnd => A_END,
    target: (): ProbeLineEnd => B_END,
    visible: (): boolean => facts.isVisible,
    sourceEndpoint: (): Position => START,
    targetEndpoint: (): Position => END,
    controlPoints: (): Position[] | undefined => facts.controls,
    midpoint: (): Position => MIDDLE
  };

  return source;
};

const renderedOf = (point: Position): Position => {
  const rendered: Position = { x: point.x * ZOOM + OFFSET.x, y: point.y * ZOOM + OFFSET.y };

  return rendered;
};

describe('FEATURE: edgeLineOf', () => {
  describe('GIVEN an edge with two control points', () => {
    it('WHEN read THEN points are start, the control points and the end, in rendered px', () => {
      const line = edgeLineOf(sourceOf(BENT_FACTS), ZOOM, OFFSET);

      expect(line.points).toStrictEqual([
        { x: 130, y: 110 },
        { x: 130, y: 190 },
        { x: 210, y: 190 },
        { x: 210, y: 270 }
      ]);
    });

    it('WHEN read THEN it names its ends, says it is drawn, and puts the midpoint in rendered px', () => {
      const line = edgeLineOf(sourceOf(BENT_FACTS), ZOOM, OFFSET);

      expect(line).toMatchObject({ source: 'a', target: 'b', isDrawn: true, midpoint: MIDDLE_RENDERED });
    });
  });

  describe('GIVEN a straight edge with no control points', () => {
    it('WHEN read THEN points are start and end only', () => {
      const line = edgeLineOf(sourceOf({ ...BENT_FACTS, controls: undefined }), ZOOM, OFFSET);

      expect(line.points).toStrictEqual([renderedOf(START), renderedOf(END)]);
    });
  });

  describe('GIVEN a bezier edge with one control point', () => {
    it('WHEN read THEN its control point sits between the ends', () => {
      const control: Position = { x: 20, y: 40 };
      const line = edgeLineOf(sourceOf({ ...BENT_FACTS, controls: [control] }), ZOOM, OFFSET);

      expect(line.points).toStrictEqual([renderedOf(START), renderedOf(control), renderedOf(END)]);
    });
  });

  describe('GIVEN an edge Cytoscape does not draw', () => {
    it('WHEN read THEN it is not drawn and has no points', () => {
      const line: ProbeEdgeLine = edgeLineOf(sourceOf({ ...BENT_FACTS, isVisible: false }), ZOOM, OFFSET);

      expect(line).toMatchObject({ isDrawn: false, points: [] });
    });
  });
});

describe('FEATURE: folderLinkLinesOf', () => {
  let cy: Core;

  beforeEach(() => {
    cy = boardsCyMock();
    createFoldersView(cy).show(boardsSceneOf(['apps']), (folder: string): string => folder);
    cy.edges(`.${FOLDER_LINK_CLASS}`).addClass(FOLDER_HIDDEN_CLASS);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN 4 package edges and 2 hidden folder links', () => {
    it('WHEN read THEN there are 2 lines, none of a package edge', () => {
      const lines = folderLinkLinesOf(cy, { x: 0, y: 0 });
      const sources = lines.map((line): string => line.source);

      expect(sources).toStrictEqual([collapsedIdOf('apps'), collapsedIdOf('apps')]);
    });

    it('WHEN read THEN each line is not drawn, has no points and names the raw ends', () => {
      const [first] = folderLinkLinesOf(cy, { x: 0, y: 0 });

      expect(first).toMatchObject({ target: '@acme/ui', isDrawn: false, points: [] });
    });
  });
});
