import { describe, expect, it, vi } from 'vitest';

import { GraphInspectionFolders } from './graph-inspection-folders.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { InspectionFolders } from '../common/graph-inspection.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { TraceResult } from '../common/trace.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, THREE, THREE_EDGES, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { folderInspection, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';

type Expand = InspectionFolders['expand'];

const UT = '@acme/utils';

const BOTH_COLLAPSED = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { collapsed: ['apps', 'packages'] });

const NONE_COLLAPSED = sceneOf(BOARDS_INFOS, BOARDS_EDGES, {});

const F2_COLLAPSED = sceneOf(THREE, THREE_EDGES, { collapsed: ['f2'] });

const F2_GHOST = sceneOf(THREE, THREE_EDGES, { collapsed: ['f2'], visible: ['a', 'c', 'd'], ghosts: ['b'] });

const pathOf = (path: string[]): TraceResult => {
  const result: TraceResult = { direction: 'forward', path, edges: [] };

  return result;
};

const BOARDS_PATH = pathOf(['web', '@acme/ui', UT]);

const THREE_PATH = pathOf(['a', 'b', 'c']);

const fakeFolders = (scene: FolderScene | null, expand: Expand): InspectionFolders => {
  const folders: InspectionFolders = { scene: (): FolderScene | null => scene, expand, toggle: vi.fn() };

  return folders;
};

describe('FEATURE: GraphInspectionFolders', () => {
  describe('GIVEN an inspection about to be shown and the collapsed folders', () => {
    it.each([
      { title: 'a package in a collapsed folder', next: pkg('web'), trace: null, scene: BOTH_COLLAPSED, calls: [[['apps']]] },
      { title: 'none', next: NO_INSPECTION, trace: null, scene: BOTH_COLLAPSED, calls: [] },
      { title: 'a folder', next: folderInspection('apps'), trace: null, scene: BOTH_COLLAPSED, calls: [] },
      {
        title: 'a trace across both folders',
        next: trace('web', UT),
        trace: BOARDS_PATH,
        scene: BOTH_COLLAPSED,
        calls: [[['apps', 'packages']]]
      },
      {
        title: 'a trace through a collapsed middle',
        next: trace('a', 'c'),
        trace: THREE_PATH,
        scene: F2_COLLAPSED,
        calls: [[['f2']]]
      },
      { title: 'a trace through a ghost middle', next: trace('a', 'c'), trace: THREE_PATH, scene: F2_GHOST, calls: [[['f2']]] },
      { title: 'a package with nothing collapsed', next: pkg('web'), trace: null, scene: NONE_COLLAPSED, calls: [] },
      { title: 'a package with no scene', next: pkg('web'), trace: null, scene: null, calls: [] }
    ])('WHEN it reaches $title THEN expand is called exactly so', ({ next, trace: result, scene, calls }) => {
      const expand = vi.fn<Expand>();
      const reach = new GraphInspectionFolders(fakeFolders(scene, expand));

      reach.reach(next, result);

      expect(expand.mock.calls).toStrictEqual(calls);
    });
  });

  describe('GIVEN the inspection and a folder just collapsed', () => {
    it.each([
      { title: 'a package inside', current: pkg('web'), folder: 'apps', expected: folderInspection('apps') },
      { title: 'a package outside', current: pkg('web'), folder: 'packages', expected: null },
      { title: 'a picking start inside', current: pick('web', false), folder: 'apps', expected: folderInspection('apps') },
      { title: 'none', current: NO_INSPECTION, folder: 'apps', expected: null }
    ])('WHEN $title is collapsed THEN the changed inspection is exact', ({ current, folder, expected }) => {
      const expand = vi.fn<Expand>();
      const reach = new GraphInspectionFolders(fakeFolders(BOTH_COLLAPSED, expand));

      const next = reach.afterCollapse(current, folder);

      expect(next).toStrictEqual(expected);
    });
  });
});
