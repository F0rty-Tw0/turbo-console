import { describe, expect, it, vi } from 'vitest';

import { nodeSizeOf } from './node-size.util.ts';
import { titleWidthsOf } from './task-title-width.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

type TitleRequest = Pick<TaskLayoutRequest, 'tasks' | 'shown'>;

const SIZER = (text: string): NodeSize => nodeSizeOf(text.length * 10);

const FRACTIONAL = (text: string): NodeSize => nodeSizeOf(text.length * 10 + 0.4);

const TASKS: GraphTask[] = [taskOf('@acme/web#build', []), taskOf('@acme/web#lint', []), taskOf('ui#build', [])];

const ALL_SHOWN: TitleRequest = { tasks: TASKS, shown: new Set(['@acme/web#build', '@acme/web#lint', 'ui#build']) };

const WEB_LINT_SHOWN: TitleRequest = { tasks: TASKS, shown: new Set(['@acme/web#lint']) };

describe('FEATURE: titleWidthsOf', () => {
  describe('GIVEN tasks of two packages, all shown', () => {
    it('WHEN measured THEN one title width per package: the sizer width minus the node padding, plus 1 px', () => {
      const widths = titleWidthsOf(ALL_SHOWN, SIZER);

      expect(widths).toStrictEqual(
        new Map([
          ['@acme/web', 91],
          ['ui', 21]
        ])
      );
    });

    it('WHEN measured THEN each package is measured once', () => {
      const sizer = vi.fn(SIZER);

      titleWidthsOf(ALL_SHOWN, sizer);

      expect(sizer.mock.calls).toStrictEqual([['@acme/web'], ['ui']]);
    });

    it('WHEN the measure is fractional THEN the width is rounded up, plus 1 px', () => {
      const widths = titleWidthsOf(ALL_SHOWN, FRACTIONAL);

      expect(widths.get('ui')).toBe(22);
    });
  });

  describe('GIVEN only one task of one package shown', () => {
    it('WHEN measured THEN only the package with a shown task is measured', () => {
      const sizer = vi.fn(SIZER);

      titleWidthsOf(WEB_LINT_SHOWN, sizer);

      expect(sizer.mock.calls).toStrictEqual([['@acme/web']]);
    });

    it('WHEN measured THEN the package with no shown task gets no width', () => {
      const widths = titleWidthsOf(WEB_LINT_SHOWN, SIZER);

      expect(widths).toStrictEqual(new Map([['@acme/web', 91]]));
    });
  });
});
