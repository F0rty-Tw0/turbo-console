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
  const config: TurboConfigOk = {
    path,
    descriptions: {},
    tasks,
    persistent: {},
    extends: extendsNames,
    affectedUsingTaskInputs: false
  };

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

const BASE_PATH = 'tools/base/turbo.json';

const WEB_PATH = 'apps/web/turbo.json';

const GRAND_ROOT = configOf('turbo.json', { lint: 'defined' }, []);

const GP_CONFIG = configOf('tools/gp/turbo.json', { gx: 'defined' }, ['//']);

const WEB = packageOf('web', 'apps/web');

const GRAND_PACKAGES = [packageOf('gp', 'tools/gp'), packageOf('base', 'tools/base'), WEB];

/** `web`'s task names when the root defines `lint`, `gp` defines `gx`, and `base` and `web` have the given configs. */
const webNamesOf = (base: TurboConfigOk, web: TurboConfigOk): string[] | null => {
  const configs: TurboConfigFile[] = [GRAND_ROOT, GP_CONFIG, base, web];
  const lookup = turboTaskLookupOf(configs, GRAND_PACKAGES);

  return namesOf(lookup, WEB);
};

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

    it('WHEN two packages with no config and no qualified root key are looked up THEN they share one set', () => {
      const other = packageOf('@acme/f', 'packages/f');
      const sharedLookup = turboTaskLookupOf(PROBE_CONFIGS, [...PROBE_PACKAGES, other]);

      expect(turboTaskNamesOf(sharedLookup, A)).toBe(turboTaskNamesOf(sharedLookup, other));
    });

    it('WHEN the root package is looked up THEN only its //# task is its task', () => {
      const root = packageOf('//', '.');

      expect(namesOf(lookup, root)).toStrictEqual(['fmt']);
    });
  });

  describe('GIVEN a parent package config that excludes a root task', () => {
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

    it('WHEN a package extends the excluding config THEN the root task stays', () => {
      expect(namesOf(lookup, web)).toStrictEqual(['lint', 'test']);
    });

    it('WHEN a package redefines the excluded task THEN it keeps it', () => {
      expect(namesOf(lookup, docs)).toStrictEqual(['lint', 'test']);
    });

    it('WHEN the excluding package is looked up THEN its own exclusion drops the root task', () => {
      expect(namesOf(lookup, base)).toStrictEqual(['test']);
    });
  });

  describe('GIVEN a task only a grandparent package config defines', () => {
    it('WHEN the parent extends it and has no entry THEN the child inherits the task', () => {
      const base = configOf(BASE_PATH, {}, ['//', 'gp']);
      const web = configOf(WEB_PATH, {}, ['//', 'base']);

      expect(webNamesOf(base, web)).toStrictEqual(['gx', 'lint']);
    });

    it('WHEN the parent extends it and excludes the task THEN the child loses it', () => {
      const base = configOf(BASE_PATH, { gx: 'excluded' }, ['//', 'gp']);
      const web = configOf(WEB_PATH, {}, ['//', 'base']);

      expect(webNamesOf(base, web)).toStrictEqual(['lint']);
    });

    it('WHEN the child lists the defining package before the excluding one THEN it keeps the task', () => {
      const base = configOf(BASE_PATH, { gx: 'excluded' }, ['//']);
      const web = configOf(WEB_PATH, {}, ['//', 'gp', 'base']);

      expect(webNamesOf(base, web)).toStrictEqual(['gx', 'lint']);
    });

    it('WHEN the child lists the excluding package before the defining one THEN it loses the task', () => {
      const base = configOf(BASE_PATH, { gx: 'excluded' }, ['//']);
      const web = configOf(WEB_PATH, {}, ['//', 'base', 'gp']);

      expect(webNamesOf(base, web)).toStrictEqual(['lint']);
    });

    it('WHEN the child defines the task its parent excludes THEN it keeps the task', () => {
      const base = configOf(BASE_PATH, { gx: 'excluded' }, ['//', 'gp']);
      const web = configOf(WEB_PATH, { gx: 'defined' }, ['//', 'base']);

      expect(webNamesOf(base, web)).toStrictEqual(['gx', 'lint']);
    });
  });

  describe('GIVEN a package config whose extends does not start with //', () => {
    it('WHEN // comes after a package THEN it cannot tell', () => {
      const base = configOf(BASE_PATH, {}, ['//']);
      const web = configOf(WEB_PATH, {}, ['base', '//']);

      expect(webNamesOf(base, web)).toBeNull();
    });

    it('WHEN extends is empty THEN it cannot tell', () => {
      const base = configOf(BASE_PATH, {}, ['//']);
      const web = configOf(WEB_PATH, {}, []);

      expect(webNamesOf(base, web)).toBeNull();
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
