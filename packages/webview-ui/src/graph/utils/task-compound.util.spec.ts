import { describe, expect, it } from 'vitest';

import { parentIdOf, scriptsBoxIdOf, taskBoxIdOf } from './task-compound.util.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

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
});
