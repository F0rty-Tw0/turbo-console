import { describe, expect, it } from 'vitest';

import { folderIdOf } from './folder-id.util.ts';
import { folderBoxIdOf, parentIdOf, scriptsBoxIdOf, taskBoxIdOf } from './task-compound.util.ts';
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
  });

  describe('GIVEN an ungrouped naming', () => {
    it('WHEN the folder box of web is read THEN there is none', () => {
      expect(folderBoxIdOf('web', { ...NAMING_GROUPED, grouped: false })).toBeNull();
    });
  });
});
