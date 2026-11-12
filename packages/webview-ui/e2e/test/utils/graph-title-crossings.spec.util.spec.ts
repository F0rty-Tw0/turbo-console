import { describe, expect, it } from 'vitest';

import { lineThrough } from './graph-lines.spec.util.ts';
import { titleCrossingsOf, unreadableTitlesOf } from './graph-title-crossings.spec.util.ts';
import type { ProbeLink, ProbeRect, ProbeTitle } from '../../../src/graph/common/graph-probe-titles.type.ts';
import type { ProbeEdgeLine } from '../../../src/graph/common/graph-probe.type.ts';

/** The title of `pkg:web`: its label runs x 100-160, y 100-113. */
const LABEL: ProbeRect = { left: 100, top: 100, width: 60, height: 13 };

const BOX: ProbeRect = { left: 90, top: 90, width: 120, height: 80 };

const TITLE: ProbeTitle = {
  id: 'pkg:web',
  text: 'web',
  label: LABEL,
  box: BOX,
  modelBox: BOX,
  isFramed: false,
  frameError: null,
  titleError: null,
  backdrop: 'rgb(17,17,17)',
  linesOver: []
};

const A_TO_B: ProbeLink = { source: 'a', target: 'b' };

const OVER_A_TO_B: ProbeLink[] = [A_TO_B];

/** `TITLE` drawn before the line a to b, so under it. */
const UNDER_TITLE: ProbeTitle = { ...TITLE, linesOver: OVER_A_TO_B };

/** `TITLE` with no opaque backdrop. */
const BARE_TITLE: ProbeTitle = { ...TITLE, backdrop: null };

/** A vertical line at x 130 through the label, from y 90 to 130. */
const THROUGH_LINE: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 130, y: 90 },
  { x: 130, y: 130 }
]);

const BESIDE_LINE: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 170, y: 90 },
  { x: 170, y: 130 }
]);

const HIDDEN_LINE: ProbeEdgeLine = { ...THROUGH_LINE, isDrawn: false };

/** A line from up and left that ends on the label's top left corner. */
const CORNER_LINE: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 80, y: 80 },
  { x: 100, y: 100 }
]);

describe('FEATURE: titleCrossingsOf', () => {
  it.each([
    { title: 'a drawn line through the label', line: THROUGH_LINE, expected: ['pkg:web'] },
    { title: 'a drawn line at x 170, right of the label', line: BESIDE_LINE, expected: [] },
    { title: 'the line through the label not drawn', line: HIDDEN_LINE, expected: [] },
    { title: "a drawn line ending on the label's corner", line: CORNER_LINE, expected: ['pkg:web'] }
  ])('GIVEN $title WHEN the crossed titles are listed THEN they are $expected', ({ line, expected }) => {
    const crossed = titleCrossingsOf([TITLE], [line]);

    expect(crossed).toStrictEqual(expected);
  });
});

describe('FEATURE: unreadableTitlesOf', () => {
  it.each([
    { title: 'a line through the label, drawn under the title on its backdrop', box: TITLE, line: THROUGH_LINE, expected: [] },
    { title: 'a line through the label, drawn over the title', box: UNDER_TITLE, line: THROUGH_LINE, expected: ['pkg:web'] },
    { title: 'a line through a label with no backdrop', box: BARE_TITLE, line: THROUGH_LINE, expected: ['pkg:web'] },
    { title: 'a line beside the label, drawn over the title', box: UNDER_TITLE, line: BESIDE_LINE, expected: [] },
    { title: 'the line drawn over the title not drawn', box: UNDER_TITLE, line: HIDDEN_LINE, expected: [] }
  ])('GIVEN $title WHEN the unreadable titles are listed THEN they are $expected', ({ box, line, expected }) => {
    const unreadable = unreadableTitlesOf([box], [line]);

    expect(unreadable).toStrictEqual(expected);
  });
});
