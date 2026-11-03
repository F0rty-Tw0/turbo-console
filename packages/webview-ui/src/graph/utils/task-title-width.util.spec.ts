import { describe, expect, it, vi } from 'vitest';

import { folderTitleOf } from './controls-text.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import { nodeSizeOf } from './node-size.util.ts';
import { titleWidthsOf } from './task-title-width.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { NEUTRAL_NAMING } from '../common/graph-task.const.ts';
import type { TaskLayoutRequest, TaskNaming } from '../common/graph-task.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

type TitleRequest = Pick<TaskLayoutRequest, 'tasks' | 'shown' | 'naming'>;

const SIZER = (text: string): NodeSize => nodeSizeOf(text.length * 10);

const FRACTIONAL = (text: string): NodeSize => nodeSizeOf(text.length * 10 + 0.4);

const TASKS: GraphTask[] = [taskOf('@acme/web#build', []), taskOf('@acme/web#lint', []), taskOf('ui#build', [])];

const ALL_SHOWN: TitleRequest = {
  tasks: TASKS,
  shown: new Set(['@acme/web#build', '@acme/web#lint', 'ui#build']),
  naming: NEUTRAL_NAMING
};

const WEB_LINT_SHOWN: TitleRequest = { tasks: TASKS, shown: new Set(['@acme/web#lint']), naming: NEUTRAL_NAMING };

/** `apps` holds the package `apps` and `web`, `packages` holds `ui`; the root `//` is in no folder of the map. */
const NAMING_GROUPED: TaskNaming = {
  ...NEUTRAL_NAMING,
  grouped: true,
  folders: new Map([
    ['apps', 'apps'],
    ['web', 'apps'],
    ['ui', 'packages']
  ])
};

const FOLDER_TASKS: GraphTask[] = [taskOf('apps#build', []), taskOf('web#build', []), taskOf('ui#build', []), taskOf('//#gen', [])];

const FOLDERS_SHOWN: TitleRequest = {
  tasks: FOLDER_TASKS,
  shown: new Set(['apps#build', 'web#build', 'ui#build', '//#gen']),
  naming: NAMING_GROUPED
};

describe('FEATURE: titleWidthsOf', () => {
  describe('GIVEN tasks of two packages, all shown', () => {
    it('WHEN measured THEN one title width per package: the sizer width minus the node padding, plus 1 px', () => {
      const widths = titleWidthsOf(ALL_SHOWN, SIZER, null);

      expect(widths).toStrictEqual(
        new Map([
          ['@acme/web', 91],
          ['ui', 21]
        ])
      );
    });

    it('WHEN measured THEN each package is measured once', () => {
      const sizer = vi.fn(SIZER);

      titleWidthsOf(ALL_SHOWN, sizer, null);

      expect(sizer.mock.calls).toStrictEqual([['@acme/web'], ['ui']]);
    });

    it('WHEN the measure is fractional THEN the width is rounded up, plus 1 px', () => {
      const widths = titleWidthsOf(ALL_SHOWN, FRACTIONAL, null);

      expect(widths.get('ui')).toBe(22);
    });
  });

  describe('GIVEN only one task of one package shown', () => {
    it('WHEN measured THEN only the package with a shown task is measured', () => {
      const sizer = vi.fn(SIZER);

      titleWidthsOf(WEB_LINT_SHOWN, sizer, null);

      expect(sizer.mock.calls).toStrictEqual([['@acme/web']]);
    });

    it('WHEN measured THEN the package with no shown task gets no width', () => {
      const widths = titleWidthsOf(WEB_LINT_SHOWN, SIZER, null);

      expect(widths).toStrictEqual(new Map([['@acme/web', 91]]));
    });
  });

  describe('GIVEN shown scripts of two packages beside a turbo task', () => {
    const SCRIPTS_SHOWN: TitleRequest = {
      tasks: [taskOf('app#build', []), scriptOf('app#dev', []), scriptOf('ui#start', [])],
      shown: new Set(['app#build', 'app#dev', 'ui#start']),
      naming: NEUTRAL_NAMING
    };

    it('WHEN measured THEN each Scripts box is keyed by its box id, as wide as Scripts measures, plus 1 px', () => {
      const widths = titleWidthsOf(SCRIPTS_SHOWN, SIZER, null);

      expect(widths).toStrictEqual(
        new Map([
          ['app', 31],
          ['ui', 21],
          ['scripts:app', 71],
          ['scripts:ui', 71]
        ])
      );
    });

    it('WHEN measured THEN Scripts is measured once, after the package titles', () => {
      const sizer = vi.fn(SIZER);

      titleWidthsOf(SCRIPTS_SHOWN, sizer, null);

      expect(sizer.mock.calls).toStrictEqual([['app'], ['ui'], ['Scripts']]);
    });
  });

  describe('GIVEN a root task shown and the label single-app', () => {
    const ROOT_SHOWN: TitleRequest = { tasks: [taskOf('//#build', [])], shown: new Set(['//#build']), naming: NEUTRAL_NAMING };

    it('WHEN measured THEN the key is // and the width is that of single-app', () => {
      const sizer = vi.fn(SIZER);
      const widths = titleWidthsOf(ROOT_SHOWN, sizer, 'single-app');

      expect(sizer).toHaveBeenCalledWith('single-app');
      expect(Array.from(widths.keys())).toStrictEqual(['//']);
      expect(widths.get('//')).toBe(101);
    });
  });

  describe('GIVEN grouped, the package apps and web in apps, ui in packages and the root //', () => {
    const rootTitle = folderTitleOf('');

    it('WHEN measured THEN each folder is keyed by its folder box id, apart from the package apps', () => {
      const widths = titleWidthsOf(FOLDERS_SHOWN, SIZER, null);
      const ids = [folderIdOf('apps'), folderIdOf('packages'), folderIdOf(''), 'apps'];
      const folderWidths = ids.map((id) => widths.get(id));

      expect(folderWidths).toStrictEqual([41, 81, rootTitle.length * 10 + 1, 41]);
    });

    it('WHEN measured THEN each folder title is measured once, after the package titles', () => {
      const sizer = vi.fn(SIZER);

      titleWidthsOf(FOLDERS_SHOWN, sizer, null);

      expect(sizer.mock.calls).toStrictEqual([['apps'], ['web'], ['ui'], ['//'], ['apps'], ['packages'], [rootTitle]]);
    });
  });

  describe('GIVEN the same packages ungrouped', () => {
    it('WHEN measured THEN no folder is measured', () => {
      const widths = titleWidthsOf({ ...FOLDERS_SHOWN, naming: NEUTRAL_NAMING }, SIZER, null);

      expect(Array.from(widths.keys())).toStrictEqual(['apps', 'web', 'ui', '//']);
    });
  });
});
