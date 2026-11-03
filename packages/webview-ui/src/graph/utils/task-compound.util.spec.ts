import { describe, expect, it } from 'vitest';

import { folderIdOf } from './folder-id.util.ts';
import {
  folderBoxIdOf,
  parentIdOf,
  scriptPackagesOf,
  scriptsBoxIdOf,
  taskBoxIdOf,
  taskFolderOf,
  taskFoldersOf,
  taskPackagesOf
} from './task-compound.util.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

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
});
