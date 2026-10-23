import type { Core, ExportStringOptions } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { exportPngOf } from './graph-export.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { styleTextOf } from '../test/utils/folder-boxes.spec.util.ts';

const BOX_IDS = ['\u0001', '\u0001apps', '\u0001packages'];

const BG = '#1f1f1f';

const MAX_PX = 4096;

type PngSeen = {
  readonly options: ExportStringOptions | undefined;
  readonly classes: boolean[];
  readonly labels: string[];
  readonly width: number;
  readonly height: number;
};

const EMPTY_SEEN: PngSeen = { options: undefined, classes: [], labels: [], width: 0, height: 0 };

const hasExportingClass = (cy: Core, id: string): boolean => cy.getElementById(id).hasClass('exporting');

const labelOf = (cy: Core, id: string): string => styleTextOf(cy, id, 'label');

const classesOf = (cy: Core): boolean[] => BOX_IDS.map((id: string): boolean => hasExportingClass(cy, id));

const labelsOf = (cy: Core): string[] => BOX_IDS.map((id: string): string => labelOf(cy, id));

/** `cy.png` is overloaded, so `vi.spyOn` types it by its last overload; a typed stub takes its place and records the graph as each call sees it. */
const stubPng = (cy: Core, result: string): PngSeen[] => {
  const seen: PngSeen[] = [];
  const png = (options?: ExportStringOptions): string => {
    const { w, h } = cy.elements(':visible').boundingBox();
    const call: PngSeen = { options, classes: classesOf(cy), labels: labelsOf(cy), width: w, height: h };

    seen.push(call);

    return result;
  };

  Object.assign(cy, { png });

  return seen;
};

const callOf = (seen: PngSeen[], index: number): PngSeen => seen[index] ?? EMPTY_SEEN;

const movePackage = (cy: Core, id: string, x: number, y: number): void => {
  cy.getElementById(id).position({ x, y });
};

describe('FEATURE: exportPngOf', () => {
  let cy: Core;

  beforeEach(() => {
    cy = boxedCyMock();
    setBoxes(cy, BOX_GROUPS_STUB);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a graph with three folder boxes', () => {
    it('WHEN exporting THEN every box has the class during the call and none after', () => {
      const seen = stubPng(cy, 'AAAA');

      exportPngOf(cy, BG, 1);

      expect(callOf(seen, 0).classes).toStrictEqual([true, true, true]);
      expect(classesOf(cy)).toStrictEqual([false, false, false]);
    });

    it('WHEN cy.png throws THEN the error propagates and no box keeps the class', () => {
      Object.assign(cy, {
        png: (): string => {
          throw new Error('boom');
        }
      });

      expect(() => exportPngOf(cy, BG, 1)).toThrow('boom');
      expect(classesOf(cy)).toStrictEqual([false, false, false]);
    });

    it('WHEN exporting THEN each box label equals its folder title', () => {
      const seen = stubPng(cy, 'AAAA');

      exportPngOf(cy, BG, 1);

      expect(callOf(seen, 0).labels).toStrictEqual(['(root)', 'apps', 'packages']);
      expect(labelsOf(cy)).toStrictEqual(['', '', '']);
    });

    it('WHEN exporting THEN the options are output base64, full true, the bg, and no maxWidth or maxHeight', () => {
      const seen = stubPng(cy, 'AAAA');

      exportPngOf(cy, BG, 1);

      expect(callOf(seen, 0).options).toStrictEqual({ output: 'base64', full: true, scale: 2, bg: BG });
    });

    it('WHEN cy.png returns a string THEN exportPngOf returns it unchanged', () => {
      stubPng(cy, 'iVBORw0KGgo=');

      expect(exportPngOf(cy, BG, 1)).toBe('iVBORw0KGgo=');
    });
  });

  describe('GIVEN a graph under 2048 graph px wide and tall', () => {
    it('WHEN the ratio is 1 THEN scale is 2, and at ratio 2 it is 1', () => {
      const seen = stubPng(cy, 'AAAA');

      exportPngOf(cy, BG, 1);
      exportPngOf(cy, BG, 2);

      const scales = seen.map((call: PngSeen): number | undefined => call.options?.scale);

      expect(callOf(seen, 0).width).toBeLessThan(2048);
      expect(callOf(seen, 0).height).toBeLessThan(2048);
      expect(scales).toStrictEqual([2, 1]);
    });
  });

  describe('GIVEN a graph over 8000 graph px wide', () => {
    it('WHEN the ratio is 2 THEN scale is 4096 / ceil(width) / 2 and the image is at most 4096 px', () => {
      movePackage(cy, 'c', 9000.4, 0);

      const seen = stubPng(cy, 'AAAA');

      exportPngOf(cy, BG, 2);

      const { width, options } = callOf(seen, 0);
      const scale = options?.scale ?? 0;

      expect(width).toBeGreaterThan(8000);
      expect(scale).toBe(MAX_PX / Math.ceil(width) / 2);
      expect(width * scale * 2).toBeLessThanOrEqual(MAX_PX);
    });
  });

  describe('GIVEN a graph over 8000 graph px tall', () => {
    it('WHEN the ratio is 1 THEN scale is 4096 / ceil(height) and the image is at most 4096 px', () => {
      movePackage(cy, 'd', 250, 9000.4);

      const seen = stubPng(cy, 'AAAA');

      exportPngOf(cy, BG, 1);

      const { height, options } = callOf(seen, 0);
      const scale = options?.scale ?? 0;

      expect(height).toBeGreaterThan(8000);
      expect(scale).toBe(MAX_PX / Math.ceil(height));
      expect(height * scale).toBeLessThanOrEqual(MAX_PX);
    });
  });
});
