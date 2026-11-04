import { describe, expect, it } from 'vitest';

import { folderAt, foreignBoxHitsOf } from './graph-foreign-boxes.spec.util.ts';
import { lineThrough } from './graph-lines.spec.util.ts';
import type { ProbeEdgeLine, ProbeFolder } from '../../../src/graph/common/graph-probe.type.ts';
import { FOLDER_ID_PREFIX } from '../../../src/graph/common/graph.const.ts';

const ZOOM = 1;

/** A vertical line from a to b at x 100, y 0 to 200. */
const DOWN: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 100, y: 0 },
  { x: 100, y: 200 }
]);

/** A horizontal line from a to b at y 150, x 0 to 200. */
const ACROSS: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 0, y: 150 },
  { x: 200, y: 150 }
]);

const HIDDEN_BASE: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 100, y: 0 },
  { x: 100, y: 200 }
]);
const HIDDEN: ProbeEdgeLine = { ...HIDDEN_BASE, isDrawn: false };

/** Spans x 50-150, y 50-150: its title band is y 50-82 at zoom 1. */
const FOREIGN_ON_DOWN: ProbeFolder = folderAt('other', ['c', 'd'], [100, 100], [100, 100]);

/** Spans x 50-150, y 100-200: the title band is y 100-132 at zoom 1, 100-164 at zoom 2. */
const FOREIGN_ON_ACROSS: ProbeFolder = folderAt('other', ['c', 'd'], [100, 150], [100, 100]);

const OWN: ProbeFolder = folderAt('mine', ['a', 'c'], [100, 100], [100, 100]);

const OUTER: ProbeFolder = folderAt('outer', [`${FOLDER_ID_PREFIX}inner`], [100, 100], [100, 100]);
const INNER: ProbeFolder = folderAt('inner', ['b'], [100, 100], [20, 20]);

const BESIDE: ProbeFolder = folderAt('other', ['c', 'd'], [400, 100], [100, 100]);
const FOLDED: ProbeFolder = { ...FOREIGN_ON_DOWN, isCollapsed: true };
const HIDDEN_BOX: ProbeFolder = { ...FOREIGN_ON_DOWN, isVisible: false };

describe('FEATURE: foreignBoxHitsOf', () => {
  it.each([
    {
      title: 'a line through the title band and body of a box with neither end',
      line: DOWN,
      folders: [FOREIGN_ON_DOWN],
      zoom: ZOOM,
      hits: 2
    },
    {
      title: 'a line through the body of a box but not its title band',
      line: ACROSS,
      folders: [FOREIGN_ON_ACROSS],
      zoom: ZOOM,
      hits: 1
    },
    { title: 'the same line at zoom 2, where the title band is taller', line: ACROSS, folders: [FOREIGN_ON_ACROSS], zoom: 2, hits: 2 },
    { title: 'a box that holds one end', line: DOWN, folders: [OWN], zoom: ZOOM, hits: 0 },
    { title: 'a box that holds an end in a box nested in it', line: DOWN, folders: [OUTER, INNER], zoom: ZOOM, hits: 0 },
    { title: 'a box the line does not reach', line: DOWN, folders: [BESIDE], zoom: ZOOM, hits: 0 },
    { title: 'a collapsed box on the line', line: DOWN, folders: [FOLDED], zoom: ZOOM, hits: 0 },
    { title: 'a hidden box on the line', line: DOWN, folders: [HIDDEN_BOX], zoom: ZOOM, hits: 0 },
    { title: 'a line that is not drawn', line: HIDDEN, folders: [FOREIGN_ON_DOWN], zoom: ZOOM, hits: 0 }
  ])('GIVEN $title WHEN foreign box hits are counted THEN there are $hits', ({ line, folders, zoom, hits }) => {
    const count = foreignBoxHitsOf([line], folders, zoom);

    expect(count).toBe(hits);
  });
});
