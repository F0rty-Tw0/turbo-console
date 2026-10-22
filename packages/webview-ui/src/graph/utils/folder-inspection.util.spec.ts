import { describe, expect, it } from 'vitest';

import { collapsedInspectionOf, foldersToExpandOf, shownFoldersOf } from './folder-inspection.util.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { TraceResult } from '../common/trace.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, THREE, THREE_EDGES, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { folderInspection, link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';

const UI = '@acme/ui';

const UT = '@acme/utils';

const BOARDS_NAMES = BOARDS_INFOS.map((info) => info.name);

const THREE_NAMES = THREE.map((info) => info.name);

const boardsOf = (collapsed: string[], visible: string[] = BOARDS_NAMES): FolderScene => {
  return sceneOf(BOARDS_INFOS, BOARDS_EDGES, { collapsed, visible });
};

const threeOf = (collapsed: string[], visible: string[] = THREE_NAMES, ghosts: string[] = []): FolderScene => {
  return sceneOf(THREE, THREE_EDGES, { collapsed, visible, ghosts });
};

const pathOf = (path: string[]): TraceResult => {
  const result: TraceResult = { direction: 'forward', path, edges: [] };

  return result;
};

const BOARDS_PATH = pathOf(['web', UI, UT]);

const THREE_PATH = pathOf(['a', 'b', 'c']);

const PROTO_INFOS = [{ name: 'a', path: '__proto__/a', tags: [], taskCount: 0 }];

describe('FEATURE: foldersToExpandOf', () => {
  describe('GIVEN an inspection and the collapsed folders', () => {
    it.each([
      { title: 'none', inspection: NO_INSPECTION, trace: null, scene: boardsOf(['apps', 'packages']), expected: [] },
      {
        title: 'a package in a collapsed folder',
        inspection: pkg('web'),
        trace: null,
        scene: boardsOf(['apps', 'packages']),
        expected: ['apps']
      },
      { title: 'a package in an expanded folder', inspection: pkg('web'), trace: null, scene: boardsOf(['packages']), expected: [] },
      {
        title: 'a link across two collapsed folders',
        inspection: link('web', UI),
        trace: null,
        scene: boardsOf(['apps', 'packages']),
        expected: ['apps', 'packages']
      },
      { title: 'a picking start', inspection: pick(UI, false), trace: null, scene: boardsOf(['packages']), expected: ['packages'] },
      {
        title: 'a trace with its path',
        inspection: trace('web', UT),
        trace: BOARDS_PATH,
        scene: boardsOf(['apps', 'packages']),
        expected: ['apps', 'packages']
      },
      {
        title: 'a trace through an unticked middle package',
        inspection: trace('web', UT),
        trace: BOARDS_PATH,
        scene: boardsOf(['packages'], ['docs', 'web', UT]),
        expected: ['packages']
      },
      {
        title: 'a trace without its path',
        inspection: trace('web', UT),
        trace: null,
        scene: boardsOf(['apps', 'packages']),
        expected: ['apps', 'packages']
      },
      { title: 'a folder inspection', inspection: folderInspection('apps'), trace: null, scene: boardsOf(['apps']), expected: [] },
      { title: 'a package not in the scene', inspection: pkg('ghost'), trace: null, scene: boardsOf(['apps']), expected: [] },
      {
        title: 'a package in a __proto__ folder',
        inspection: pkg('a'),
        trace: null,
        scene: sceneOf(PROTO_INFOS, [], { collapsed: ['__proto__'] }),
        expected: ['__proto__']
      },
      {
        title: 'a trace whose only middle step is collapsed',
        inspection: trace('a', 'c'),
        trace: THREE_PATH,
        scene: threeOf(['f2']),
        expected: ['f2']
      },
      {
        title: 'a trace whose middle step is a ghost',
        inspection: trace('a', 'c'),
        trace: THREE_PATH,
        scene: threeOf(['f2'], ['a', 'c', 'd'], ['b']),
        expected: ['f2']
      }
    ])('WHEN it is $title THEN the folders to expand are exact', ({ inspection, trace: result, scene, expected }) => {
      const folders = foldersToExpandOf(inspection, result, scene);

      expect(folders).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: collapsedInspectionOf', () => {
  describe('GIVEN the inspection and the folder just collapsed', () => {
    it.each([
      {
        title: 'a package inside',
        current: pkg('web'),
        folder: 'apps',
        scene: boardsOf(['apps']),
        expected: folderInspection('apps')
      },
      { title: 'a package outside', current: pkg('web'), folder: 'packages', scene: boardsOf(['packages']), expected: pkg('web') },
      {
        title: 'a link end inside',
        current: link('web', UI),
        folder: 'packages',
        scene: boardsOf(['packages']),
        expected: folderInspection('packages')
      },
      {
        title: 'the other link end inside',
        current: link('web', UI),
        folder: 'apps',
        scene: boardsOf(['apps']),
        expected: folderInspection('apps')
      },
      {
        title: 'a picking start inside',
        current: pick('web', true),
        folder: 'apps',
        scene: boardsOf(['apps']),
        expected: folderInspection('apps')
      },
      {
        title: 'a trace through a middle step inside',
        current: trace('a', 'c'),
        folder: 'f2',
        scene: threeOf(['f2']),
        expected: folderInspection('f2')
      },
      {
        title: 'a trace missing the folder',
        current: trace('a', 'c'),
        folder: 'f3',
        scene: threeOf(['f3']),
        expected: trace('a', 'c')
      },
      {
        title: 'the folder itself',
        current: folderInspection('apps'),
        folder: 'apps',
        scene: boardsOf(['apps']),
        expected: folderInspection('apps')
      },
      {
        title: 'another folder',
        current: folderInspection('apps'),
        folder: 'packages',
        scene: boardsOf(['packages']),
        expected: folderInspection('apps')
      },
      { title: 'none', current: NO_INSPECTION, folder: 'apps', scene: boardsOf(['apps']), expected: NO_INSPECTION },
      { title: 'an unknown folder', current: pkg('web'), folder: 'zzz', scene: boardsOf([]), expected: pkg('web') }
    ])('WHEN the inspection is $title THEN the result is exact', ({ current, folder, scene, expected }) => {
      const next = collapsedInspectionOf(current, folder, scene);

      expect(next).toStrictEqual(expected);
    });

    it.each([
      { title: 'a package outside', current: pkg('web'), folder: 'packages', scene: boardsOf(['packages']) },
      { title: 'a folder of another name', current: folderInspection('apps'), folder: 'packages', scene: boardsOf(['packages']) }
    ])('WHEN the inspection is $title THEN it is returned itself', ({ current, folder, scene }) => {
      const next = collapsedInspectionOf(current, folder, scene);

      expect(next).toBe(current);
    });
  });
});

describe('FEATURE: shownFoldersOf', () => {
  describe('GIVEN a scene and the visible packages', () => {
    const ROOT_INFOS = [
      { name: 'root-a', path: 'root-a', tags: [], taskCount: 0 },
      { name: 'x', path: 'apps/x', tags: [], taskCount: 0 }
    ];

    it.each([
      {
        title: 'every package visible',
        scene: boardsOf([]),
        visible: ['docs', 'web', '@acme/config', UI, UT],
        expected: ['apps', 'packages']
      },
      { title: 'only web visible', scene: boardsOf([]), visible: ['web'], expected: ['apps'] },
      { title: 'none visible', scene: boardsOf([]), visible: [], expected: [] },
      { title: 'a null scene', scene: null, visible: ['web'], expected: [] },
      { title: 'a root package visible', scene: sceneOf(ROOT_INFOS, [], {}), visible: ['root-a'], expected: [''] }
    ])('WHEN $title THEN the shown folders are exact', ({ scene, visible, expected }) => {
      const shown = shownFoldersOf(scene, new Set(visible));

      expect(shown).toStrictEqual(new Set(expected));
    });
  });
});
