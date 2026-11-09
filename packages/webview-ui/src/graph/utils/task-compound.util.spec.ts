import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { folderIdOf } from './folder-id.util.ts';
import {
  compoundOptionsOf,
  folderBoxIdOf,
  isTitleSlotId,
  isTitleTieId,
  isTitledRow,
  parentIdOf,
  scriptPackagesOf,
  scriptsBoxIdOf,
  taskBoxIdOf,
  taskFolderOf,
  taskFoldersOf,
  taskPackagesOf,
  titleSlotIdOf,
  titleTieIdOf,
  titledRowOf
} from './task-compound.util.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import type { ElkOptions } from '../common/layout.type.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

const BASE: ElkOptions = { 'elk.layered.layering.strategy': 'LONGEST_PATH', 'elk.padding': '[top=32,left=32,bottom=32,right=32]' };

const NAMING_GROUPED: TaskNaming = {
  grouped: true,
  scopeShown: true,
  labels: new Map(),
  folders: new Map([
    ['web', 'apps'],
    ['ui', 'packages']
  ])
};

describe('FEATURE: task compound ids', () => {
  describe('GIVEN the package app', () => {
    it('WHEN its scripts box id is read THEN it is scripts:app', () => {
      const id = scriptsBoxIdOf('app');

      expect(id).toBe('scripts:app');
    });

    it('WHEN the parent of its turbo task is read THEN it is the package box', () => {
      const parent = parentIdOf(taskOf('app#build', []));

      expect(parent).toBe('pkg:app');
    });

    it('WHEN the parent of its script task is read THEN it is the scripts box', () => {
      const parent = parentIdOf(scriptOf('app#dev', []));

      expect(parent).toBe('scripts:app');
    });
  });

  describe('GIVEN the root //', () => {
    it('WHEN its box ids are read THEN they are pkg:// and scripts://', () => {
      const ids = [taskBoxIdOf('//'), scriptsBoxIdOf('//')];

      expect(ids).toStrictEqual(['pkg://', 'scripts://']);
    });
  });

  describe('GIVEN a grouped naming with web in apps and ui in packages', () => {
    it('WHEN the folder box of web is read THEN it is the apps folder id', () => {
      expect(folderBoxIdOf('web', NAMING_GROUPED)).toBe(folderIdOf('apps'));
    });

    it('WHEN the folder box of the root // is read THEN it is the root folder id', () => {
      expect(folderBoxIdOf('//', NAMING_GROUPED)).toBe(folderIdOf(''));
    });

    it('WHEN the folder box of a package the folders map lacks is read THEN it is the root folder id', () => {
      expect(folderBoxIdOf('ghost', NAMING_GROUPED)).toBe(folderIdOf(''));
    });

    it('WHEN the folders of web, the root //, ui and web again are listed THEN each folder comes once in first-seen order', () => {
      const folders = taskFoldersOf(['web', '//', 'ui', 'web'], NAMING_GROUPED);

      expect(folders).toStrictEqual(['apps', '', 'packages']);
    });
  });

  describe('GIVEN a grouped naming whose folders map holds the root // in tools', () => {
    const naming: TaskNaming = { ...NAMING_GROUPED, folders: new Map([['//', 'tools']]) };

    it('WHEN the folder of the root // is read THEN it is the root folder', () => {
      expect(taskFolderOf('//', naming)).toBe('');
    });

    it('WHEN the folder box of the root // is read THEN it is the root folder id', () => {
      expect(folderBoxIdOf('//', naming)).toBe(folderIdOf(''));
    });
  });

  describe('GIVEN an ungrouped naming', () => {
    it('WHEN the folder box of web is read THEN there is none', () => {
      expect(folderBoxIdOf('web', { ...NAMING_GROUPED, grouped: false })).toBeNull();
    });

    it('WHEN the folders of web and ui are listed THEN there are none', () => {
      expect(taskFoldersOf(['web', 'ui'], { ...NAMING_GROUPED, grouped: false })).toStrictEqual([]);
    });
  });

  describe('GIVEN app#build, the script app#dev and ui#build', () => {
    const tasks = [taskOf('app#build', []), scriptOf('app#dev', []), taskOf('ui#build', [])];

    it('WHEN their packages are listed THEN app and ui come once each', () => {
      expect(taskPackagesOf(tasks)).toStrictEqual(new Set(['app', 'ui']));
    });

    it('WHEN the packages with a script are listed THEN only app is', () => {
      expect(scriptPackagesOf(tasks)).toStrictEqual(new Set(['app']));
    });

    it('WHEN the packages with a script among the turbo tasks are listed THEN there are none', () => {
      const turboTasks = tasks.filter((task) => task.isTurboTask);

      expect(scriptPackagesOf(turboTasks)).toStrictEqual(new Set());
    });
  });

  describe('GIVEN the base options of a LONGEST_PATH view', () => {
    it('WHEN a compound has no title width THEN its options are the base', () => {
      const options = compoundOptionsOf(undefined, BASE);

      expect(options).toStrictEqual(BASE);
    });

    it('WHEN a compound has a title width of 90 THEN it keeps the base and adds the minimum', () => {
      const options = compoundOptionsOf(90, BASE);

      expect(options).toStrictEqual({ ...BASE, 'elk.nodeSize.constraints': 'MINIMUM_SIZE', 'elk.nodeSize.minimum': '(0, 154)' });
    });
  });

  describe('GIVEN a package with a title width', () => {
    const leaf: ElkNode = { id: 'api#build', width: 80, height: 32 };
    const scripts: ElkNode = { id: 'scripts:api' };
    const one = [leaf];
    const two = [leaf, { id: 'api#test' }];

    const rows = [
      { name: 'one turbo leaf and no Scripts box', width: 60, leaves: one, boxes: [], expected: true },
      { name: 'two turbo leaves', width: 60, leaves: two, boxes: [], expected: false },
      { name: 'one turbo leaf and a Scripts box', width: 60, leaves: one, boxes: [scripts], expected: false },
      { name: 'no title width', width: undefined, leaves: one, boxes: [], expected: false }
    ];

    it.each(rows)('WHEN it has $name THEN it is a titled row: $expected', ({ width, leaves, boxes, expected }) => {
      expect(isTitledRow(width, leaves, boxes)).toBe(expected);
    });

    it('WHEN its titled row is built THEN it holds a slot above the leaf and a tie in its own edges, with a thin top padding', () => {
      const box = titledRowOf('api', leaf, 60, BASE);

      const layoutOptions = { ...BASE, 'elk.padding': '[top=8,left=32,bottom=32,right=32]' };
      const children = [{ id: 'title-slot:api', width: 60, height: 13 }, leaf];
      const edges = [{ id: 'title-tie:api', sources: ['title-slot:api'], targets: ['api#build'] }];

      expect(box).toStrictEqual({ id: 'pkg:api', layoutOptions, children, edges });
    });
  });

  describe('GIVEN the title ids of the root //', () => {
    it('WHEN the slot and tie ids are read THEN each is told apart from the other and from a package id', () => {
      expect(isTitleSlotId(titleSlotIdOf('//'))).toBe(true);
      expect(isTitleTieId(titleTieIdOf('//'))).toBe(true);
      expect(isTitleSlotId(titleTieIdOf('//'))).toBe(false);
      expect(isTitleSlotId('pkg:title-slot:x')).toBe(false);
    });
  });
});
