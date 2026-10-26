import { describe, expect, it, vi } from 'vitest';

import { nodeSizeOf } from './node-size.util.ts';
import { titleWidthsOf } from './task-title-width.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const SIZER = (text: string): NodeSize => nodeSizeOf(text.length * 10);

const FRACTIONAL = (text: string): NodeSize => nodeSizeOf(text.length * 10 + 0.4);

const TASKS: GraphTask[] = [taskOf('@acme/web#build', []), taskOf('@acme/web#lint', []), taskOf('ui#build', [])];

describe('FEATURE: titleWidthsOf', () => {
  describe('GIVEN tasks of two packages', () => {
    it('WHEN measured THEN one title width per package: the sizer width minus the node padding', () => {
      const widths = titleWidthsOf(TASKS, SIZER);

      expect(widths).toStrictEqual(
        new Map([
          ['@acme/web', 90],
          ['ui', 20]
        ])
      );
    });

    it('WHEN measured THEN each package is measured once', () => {
      const sizer = vi.fn(SIZER);

      titleWidthsOf(TASKS, sizer);

      expect(sizer.mock.calls).toStrictEqual([['@acme/web'], ['ui']]);
    });

    it('WHEN the measure is fractional THEN the width is rounded up', () => {
      const widths = titleWidthsOf(TASKS, FRACTIONAL);

      expect(widths.get('ui')).toBe(21);
    });
  });
});
