import { beforeEach, describe, expect, it, vi } from 'vitest';

import { folderTitleOf } from './controls-text.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import { nodeSizeOf } from './node-size.util.ts';
import { scriptsBoxIdOf } from './task-compound.util.ts';
import { titleWidthsOf } from './task-title-width.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { ROOT_TASKS_TITLE, TITLE_WHOLE_SLACK_PX } from '../common/graph-task.const.ts';
import type { TaskLayoutRequest, TaskNaming } from '../common/graph-task.type.ts';
import { NODE_PADDING_X } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

type TitleRequest = Pick<TaskLayoutRequest, 'tasks' | 'shown' | 'naming'>;

const SIZER = (text: string): NodeSize => nodeSizeOf(text.length * 10);

const FRACTIONAL = (text: string): NodeSize => nodeSizeOf(text.length * 10 + 0.4);

const TASKS: GraphTask[] = [taskOf('@acme/web#build', []), taskOf('@acme/web#lint', []), taskOf('ui#build', [])];

const ALL_SHOWN: TitleRequest = {
  tasks: TASKS,
  shown: new Set(['@acme/web#build', '@acme/web#lint', 'ui#build']),
  naming: NAMING_STUB
};

const WEB_LINT_SHOWN: TitleRequest = { tasks: TASKS, shown: new Set(['@acme/web#lint']), naming: NAMING_STUB };

/** `apps` holds the package `apps` and `web`, `packages` holds `ui`; the root `//` is in no folder of the map. */
const NAMING_GROUPED: TaskNaming = {
  ...NAMING_STUB,
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
  describe('GIVEN a package api with a task and a script, grouped in apps, a text sizer of width 100 and a box title sizer of width 140', () => {
    const NAMING_API_IN_APPS: TaskNaming = { ...NAMING_STUB, grouped: true, folders: new Map([['api', 'apps']]) };
    const GLYPH_WIDE_SHOWN: TitleRequest = {
      tasks: [taskOf('api#build', []), scriptOf('api#dev', [])],
      shown: new Set(['api#build', 'api#dev']),
      naming: NAMING_API_IN_APPS
    };
    const boxSizer = vi.fn((): NodeSize => nodeSizeOf(140 - NODE_PADDING_X));
    let widths: Map<string, number>;

    beforeEach(() => {
      const textSizer = (): NodeSize => nodeSizeOf(100 - NODE_PADDING_X);

      widths = titleWidthsOf(GLYPH_WIDE_SHOWN, textSizer, boxSizer, null);
    });

    const expectedOf = (sizerWidth: number): number => Math.ceil(sizerWidth - NODE_PADDING_X) + TITLE_WHOLE_SLACK_PX;

    it('WHEN measured THEN the package title is as wide as the box title sizer says', () => {
      expect(widths.get('api')).toBe(expectedOf(140));
    });

    it('WHEN measured THEN the folder and Scripts titles are as wide as the text sizer says', () => {
      expect([widths.get(folderIdOf('apps')), widths.get(scriptsBoxIdOf('api'))]).toStrictEqual([expectedOf(100), expectedOf(100)]);
    });

    it('WHEN measured THEN only the package name goes to the box title sizer', () => {
      expect(boxSizer.mock.calls).toStrictEqual([['api']]);
    });
  });

  describe('GIVEN tasks of two packages, all shown', () => {
    it('WHEN measured THEN one title width per package: the sizer width minus the node padding, plus 1 px', () => {
      const widths = titleWidthsOf(ALL_SHOWN, SIZER, SIZER, null);

      expect(widths).toStrictEqual(
        new Map([
          ['@acme/web', 91],
          ['ui', 21]
        ])
      );
    });

    it('WHEN measured THEN each package is measured once', () => {
      const boxSizer = vi.fn(SIZER);

      titleWidthsOf(ALL_SHOWN, SIZER, boxSizer, null);

      expect(boxSizer.mock.calls).toStrictEqual([['@acme/web'], ['ui']]);
    });

    it('WHEN the measure is fractional THEN the width is rounded up, plus 1 px', () => {
      const widths = titleWidthsOf(ALL_SHOWN, FRACTIONAL, FRACTIONAL, null);

      expect(widths.get('ui')).toBe(22);
    });
  });

  describe('GIVEN only one task of one package shown', () => {
    it('WHEN measured THEN only the package with a shown task is measured', () => {
      const boxSizer = vi.fn(SIZER);

      titleWidthsOf(WEB_LINT_SHOWN, SIZER, boxSizer, null);

      expect(boxSizer.mock.calls).toStrictEqual([['@acme/web']]);
    });

    it('WHEN measured THEN the package with no shown task gets no width', () => {
      const widths = titleWidthsOf(WEB_LINT_SHOWN, SIZER, SIZER, null);

      expect(widths).toStrictEqual(new Map([['@acme/web', 91]]));
    });
  });

  describe('GIVEN shown scripts of two packages beside a turbo task', () => {
    const SCRIPTS_SHOWN: TitleRequest = {
      tasks: [taskOf('app#build', []), scriptOf('app#dev', []), scriptOf('ui#start', [])],
      shown: new Set(['app#build', 'app#dev', 'ui#start']),
      naming: NAMING_STUB
    };

    it('WHEN measured THEN each Scripts box is keyed by its box id, as wide as Scripts measures, plus 1 px', () => {
      const widths = titleWidthsOf(SCRIPTS_SHOWN, SIZER, SIZER, null);

      expect(widths).toStrictEqual(
        new Map([
          ['app', 31],
          ['ui', 21],
          ['scripts:app', 71],
          ['scripts:ui', 71]
        ])
      );
    });

    it('WHEN measured THEN the package titles go to the box title sizer and Scripts is measured once by the text sizer', () => {
      const textSizer = vi.fn(SIZER);
      const boxSizer = vi.fn(SIZER);

      titleWidthsOf(SCRIPTS_SHOWN, textSizer, boxSizer, null);

      expect(boxSizer.mock.calls).toStrictEqual([['app'], ['ui']]);
      expect(textSizer.mock.calls).toStrictEqual([['Scripts']]);
    });
  });

  describe('GIVEN a root task shown and the label single-app', () => {
    const ROOT_SHOWN: TitleRequest = { tasks: [taskOf('//#build', [])], shown: new Set(['//#build']), naming: NAMING_STUB };

    it('WHEN measured THEN the key is // and the width is that of single-app', () => {
      const boxSizer = vi.fn(SIZER);
      const widths = titleWidthsOf(ROOT_SHOWN, SIZER, boxSizer, 'single-app');

      expect(boxSizer).toHaveBeenCalledWith('single-app');
      expect(Array.from(widths.keys())).toStrictEqual(['//']);
      expect(widths.get('//')).toBe(101);
    });
  });

  describe('GIVEN a root task shown and no root label', () => {
    const ROOT_SHOWN: TitleRequest = { tasks: [taskOf('//#build', [])], shown: new Set(['//#build']), naming: NAMING_STUB };

    it('WHEN measured THEN the key is // and the width is that of the root title', () => {
      const widths = titleWidthsOf(ROOT_SHOWN, SIZER, SIZER, null);

      expect(widths.get('//')).toBe(ROOT_TASKS_TITLE.length * 10 + 1);
    });
  });

  describe('GIVEN a package shown with the label web', () => {
    it('WHEN measured THEN the key is its name and the width is that of the label', () => {
      const naming: TaskNaming = { ...NAMING_STUB, labels: new Map([['@acme/web', 'web']]) };
      const widths = titleWidthsOf({ ...WEB_LINT_SHOWN, naming }, SIZER, SIZER, null);

      expect(widths.get('@acme/web')).toBe(31);
    });
  });

  describe('GIVEN grouped, the package apps and web in apps, ui in packages and the root //', () => {
    const rootTitle = folderTitleOf('');

    it('WHEN measured THEN each folder is keyed by its folder box id, apart from the package apps', () => {
      const widths = titleWidthsOf(FOLDERS_SHOWN, SIZER, SIZER, null);
      const ids = [folderIdOf('apps'), folderIdOf('packages'), folderIdOf(''), 'apps'];
      const folderWidths = ids.map((id) => widths.get(id));

      expect(folderWidths).toStrictEqual([41, 81, rootTitle.length * 10 + 1, 41]);
    });

    it('WHEN measured THEN the package titles go to the box title sizer and each folder title is measured once by the text sizer', () => {
      const textSizer = vi.fn(SIZER);
      const boxSizer = vi.fn(SIZER);

      titleWidthsOf(FOLDERS_SHOWN, textSizer, boxSizer, null);

      expect(boxSizer.mock.calls).toStrictEqual([['apps'], ['web'], ['ui'], [ROOT_TASKS_TITLE]]);
      expect(textSizer.mock.calls).toStrictEqual([['apps'], ['packages'], [rootTitle]]);
    });
  });

  describe('GIVEN the same packages ungrouped', () => {
    it('WHEN measured THEN no folder is measured', () => {
      const widths = titleWidthsOf({ ...FOLDERS_SHOWN, naming: NAMING_STUB }, SIZER, SIZER, null);

      expect(Array.from(widths.keys())).toStrictEqual(['apps', 'web', 'ui', '//']);
    });
  });
});
