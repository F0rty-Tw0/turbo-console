import { describe, expect, it } from 'vitest';

import { findFolder, outOfViewOf } from './graph-folders.spec.util.ts';
import { folderAt } from './graph-foreign-boxes.spec.util.ts';
import type { ProbeFolder } from '../../../src/graph/common/graph-probe.type.ts';
import type { ElementRect } from '../../common/playwright.type.ts';

/** Spans x 0-400, y 0-300. */
const CANVAS: ElementRect = { left: 0, top: 0, width: 400, height: 300 };

/** Spans x 50-150, y 50-150: inside the canvas. */
const IN_VIEW: ProbeFolder = folderAt('a', ['x'], [100, 100], [100, 100]);

/** Spans x 950-1050, y 50-150: right of the canvas. */
const OUT_OF_VIEW: ProbeFolder = folderAt('b', ['y'], [1000, 100], [100, 100]);

describe('FEATURE: graph folders', () => {
  describe.each([
    { title: 'a folder not drawn yet', folders: [], keys: ['a'], outOfView: ['a'] },
    { title: 'a drawn folder inside the canvas', folders: [IN_VIEW], keys: ['a'], outOfView: [] },
    { title: 'a drawn folder off the canvas', folders: [IN_VIEW, OUT_OF_VIEW], keys: ['a', 'b'], outOfView: ['b'] }
  ])('GIVEN $title', ({ folders, keys, outOfView }): void => {
    it(`WHEN the folders out of view are listed THEN it returns ${JSON.stringify(outOfView)}`, (): void => {
      const listed = outOfViewOf(CANVAS, folders, keys);

      expect(listed).toStrictEqual(outOfView);
    });
  });

  describe('GIVEN no box with the key', () => {
    it('WHEN the folder is looked up by that key THEN it returns undefined', (): void => {
      const found = findFolder([IN_VIEW], 'b');

      expect(found).toBeUndefined();
    });
  });

  describe('GIVEN a box with the key', () => {
    it('WHEN the folder is looked up by that key THEN it returns that box', (): void => {
      const found = findFolder([IN_VIEW, OUT_OF_VIEW], 'b');

      expect(found).toBe(OUT_OF_VIEW);
    });
  });
});
