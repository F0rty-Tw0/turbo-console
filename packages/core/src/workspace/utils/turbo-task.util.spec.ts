import { describe, expect, it } from 'vitest';

import { turboTaskLookupOf, turboTaskNamesOf } from './turbo-task.util.ts';
import type {
  TaskPresence,
  TurboConfigError,
  TurboConfigFile,
  TurboConfigOk,
  TurboTaskLookup,
  TurboTaskPackage
} from '../common/turbo-config.type.ts';

const configOf = (path: string, tasks: Record<string, TaskPresence>, extendsNames: string[]): TurboConfigOk => {
  const config: TurboConfigOk = { path, descriptions: {}, tasks, extends: extendsNames, affectedUsingTaskInputs: false };

  return config;
};

const packageOf = (name: string, path: string): TurboTaskPackage => {
  const pkg: TurboTaskPackage = { name, path };

  return pkg;
};

const namesOf = (lookup: TurboTaskLookup, pkg: TurboTaskPackage): string[] | null => {
  const names = turboTaskNamesOf(lookup, pkg);

  if (names === null) return null;

  return Array.from(names).toSorted();
};

const ROOT_TASKS: Record<string, TaskPresence> = {
  build: 'defined',
  '@acme/b#special': 'defined',
  '//#fmt': 'defined',
  dev: 'defined'
};

const ROOT = configOf('turbo.jsonc', ROOT_TASKS, []);

const A = packageOf('@acme/a', 'packages/a');

const B = packageOf('@acme/b', 'packages/b');

const C = packageOf('@acme/c', 'packages/c');

const D = packageOf('@acme/d', 'packages/d');

const E = packageOf('@acme/e', 'packages/e');

const C_CONFIG = configOf('packages/c/turbo.json', { own: 'defined' }, ['//']);

const D_CONFIG = configOf('packages/d/turbo.json', { build: 'excluded' }, ['//']);

const E_CONFIG = configOf('packages/e/turbo.json', {}, ['//', '@acme/c']);

const PROBE_CONFIGS: TurboConfigFile[] = [ROOT, C_CONFIG, D_CONFIG, E_CONFIG];

const PROBE_PACKAGES = [A, B, C, D, E];

const PARSE_ERROR: TurboConfigError = { path: 'packages/c/turbo.json', error: 'InvalidSymbol at 3' };

describe('FEATURE: task names turbo defines for a package', () => {
  describe('GIVEN the turbo 2.11.7 probe workspace', () => {
    const lookup = turboTaskLookupOf(PROBE_CONFIGS, PROBE_PACKAGES);

    it('WHEN a package with no config is looked up THEN only the root bare keys are its tasks', () => {
      expect(namesOf(lookup, A)).toStrictEqual(['build', 'dev']);
    });

    it('WHEN the package a root key names is looked up THEN its qualified task is added', () => {
      expect(namesOf(lookup, B)).toStrictEqual(['build', 'dev', 'special']);
    });

    it('WHEN a package whose config adds a task is looked up THEN that task is added', () => {
      expect(namesOf(lookup, C)).toStrictEqual(['build', 'dev', 'own']);
    });

    it('WHEN a package whose config sets a task to extends false is looked up THEN that task is dropped', () => {
      expect(namesOf(lookup, D)).toStrictEqual(['dev']);
    });

    it('WHEN a package extending another package is looked up THEN it inherits that package tasks', () => {
      expect(namesOf(lookup, E)).toStrictEqual(['build', 'dev', 'own']);
    });

    it('WHEN the root package is looked up THEN only its //# task is its task', () => {
      const root = packageOf('//', '.');

      expect(namesOf(lookup, root)).toStrictEqual(['fmt']);
    });
  });

  describe('GIVEN a chain that excludes, then redefines', () => {
    const base = packageOf('base', 'tools/base');
    const web = packageOf('web', 'apps/web');
    const docs = packageOf('docs', 'apps/docs');
    const configs: TurboConfigFile[] = [
      configOf('turbo.json', { lint: 'defined', test: 'defined' }, []),
      configOf('tools/base/turbo.json', { lint: 'excluded' }, ['//']),
      configOf('apps/web/turbo.json', {}, ['//', 'base']),
      configOf('apps/docs/turbo.json', { lint: 'defined' }, ['//', 'base'])
    ];
    const lookup = turboTaskLookupOf(configs, [base, web, docs]);

    it('WHEN a package extends the excluding config THEN the exclusion propagates', () => {
      expect(namesOf(lookup, web)).toStrictEqual(['test']);
    });

    it('WHEN a package redefines the excluded task THEN it is back', () => {
      expect(namesOf(lookup, docs)).toStrictEqual(['lint', 'test']);
    });
  });

  describe('GIVEN two package configs that extend each other', () => {
    it('WHEN one is looked up THEN the cycle ends and both add their tasks', () => {
      const x = packageOf('x', 'packages/x');
      const y = packageOf('y', 'packages/y');
      const configs: TurboConfigFile[] = [
        configOf('turbo.json', {}, []),
        configOf('packages/x/turbo.json', { fromX: 'defined' }, ['//', 'y']),
        configOf('packages/y/turbo.json', { fromY: 'defined' }, ['//', 'x'])
      ];
      const lookup = turboTaskLookupOf(configs, [x, y]);

      expect(namesOf(lookup, x)).toStrictEqual(['fromX', 'fromY']);
    });
  });

  describe('GIVEN a package path with backslashes', () => {
    it('WHEN looked up THEN its config at the posix path is read', () => {
      const pkg = packageOf('@acme/c', 'packages\\c');
      const lookup = turboTaskLookupOf([ROOT, C_CONFIG], [pkg]);

      expect(namesOf(lookup, pkg)).toStrictEqual(['build', 'dev', 'own']);
    });
  });

  describe('GIVEN configs it cannot read', () => {
    it('WHEN there is no root config THEN it cannot tell', () => {
      const lookup = turboTaskLookupOf([C_CONFIG], [C]);

      expect(namesOf(lookup, C)).toBeNull();
    });

    it('WHEN the root config did not parse THEN it cannot tell', () => {
      const rootError: TurboConfigError = { path: 'turbo.json', error: 'InvalidSymbol at 3' };
      const lookup = turboTaskLookupOf([rootError], [A]);

      expect(namesOf(lookup, A)).toBeNull();
    });

    it('WHEN the package config did not parse THEN it cannot tell', () => {
      const lookup = turboTaskLookupOf([ROOT, PARSE_ERROR], [C]);

      expect(namesOf(lookup, C)).toBeNull();
    });

    it('WHEN an extended package config did not parse THEN it cannot tell', () => {
      const lookup = turboTaskLookupOf([ROOT, PARSE_ERROR, E_CONFIG], [C, E]);

      expect(namesOf(lookup, E)).toBeNull();
    });

    it('WHEN an extends name is no package THEN it cannot tell', () => {
      const lookup = turboTaskLookupOf([ROOT, E_CONFIG], [E]);

      expect(namesOf(lookup, E)).toBeNull();
    });
  });
});
