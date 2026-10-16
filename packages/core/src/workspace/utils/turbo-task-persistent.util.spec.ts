import { describe, expect, it, vi } from 'vitest';

import { parseTurboConfig } from './turbo-config.util.ts';
import { turboTaskLookupOf, turboTasksOf } from './turbo-task.util.ts';
import type { TurboConfigFile, TurboTaskFacts, TurboTaskLookup, TurboTaskPackage } from '../common/turbo-config.type.ts';
import type { PersistentFixturePackage } from '../test/common/persistent-fixture.type.ts';
import { P1D_ROOT_TURBO_STUB, P1_ROOT_TURBO_STUB, PERSISTENT_PACKAGES_STUB } from '../test/stubs/persistent-fixture.stub.ts';

type PersistentRow = [string, boolean];

const configOf = (dir: string, turbo: string): TurboConfigFile => parseTurboConfig(`${dir}/turbo.json`, turbo);

const hasConfig = (pkg: PersistentFixturePackage): boolean => pkg.turbo !== null;

const packageConfigOf = (pkg: PersistentFixturePackage): TurboConfigFile => configOf(pkg.dir, pkg.turbo ?? '{}');

const graphPackageOf = (pkg: PersistentFixturePackage): TurboTaskPackage => {
  const graphPackage: TurboTaskPackage = { name: pkg.name, path: pkg.dir };

  return graphPackage;
};

const lookupOf = (rootTurbo: string, packages: PersistentFixturePackage[]): TurboTaskLookup => {
  const root = parseTurboConfig('turbo.json', rootTurbo);
  const packageConfigs = packages.filter(hasConfig).map(packageConfigOf);
  const graphPackages = packages.map(graphPackageOf);

  return turboTaskLookupOf([root, ...packageConfigs], graphPackages);
};

const tasksOf = (lookup: TurboTaskLookup, name: string): ReadonlyMap<string, TurboTaskFacts> | null => {
  const pkg = lookup.packagesByName.get(name);

  if (pkg === undefined) throw new Error(`no package ${name}`);

  return turboTasksOf(lookup, pkg);
};

/** `persistent` of the task `<package>#<task>` names, `undefined` when turbo does not define it. */
const persistentOf = (lookup: TurboTaskLookup, id: string): boolean | undefined => {
  const hashAt = id.lastIndexOf('#');
  const name = id.slice(0, hashAt);
  const task = id.slice(hashAt + 1);
  const facts = tasksOf(lookup, name)?.get(task);

  return facts?.persistent;
};

const fixturePackage = (name: string, turbo: string | null): PersistentFixturePackage => {
  const pkg: PersistentFixturePackage = { dir: `pkgs/${name}`, name, scripts: [], turbo };

  return pkg;
};

/** Spec Review Focus 1: `a<k>` and `b<k>` each extend both of level k − 1, so the literal walk doubles per level. */
const diamondPackages = (levels: number): PersistentFixturePackage[] => {
  const packages = [
    fixturePackage('a0', '{"extends":["//"],"tasks":{"dev":{"persistent":true}}}'),
    fixturePackage('b0', '{"extends":["//"],"tasks":{"dev":{}}}')
  ];

  for (let level = 1; level < levels; level += 1) {
    const turbo = `{"extends":["//","a${level - 1}","b${level - 1}"],"tasks":{"dev":{}}}`;

    packages.push(fixturePackage(`a${level}`, turbo), fixturePackage(`b${level}`, turbo));
  }

  return packages;
};

/** The 12-level diamond read its 25 configs 89 times when written: 5 per config leaves headroom, the literal walk does not fit. */
const READS_PER_CONFIG = 5;

/** Throws past `READS_PER_CONFIG` reads per config, so a walk gone exponential fails at once instead of hanging. */
const guardReads = (lookup: TurboTaskLookup): void => {
  const { configsByDir } = lookup;
  const limit = READS_PER_CONFIG * configsByDir.size;
  const read = configsByDir.get.bind(configsByDir);
  let reads = 0;

  const guardedRead = (dir: string): TurboConfigFile | undefined => {
    reads += 1;

    if (reads > limit) throw new Error(`more than ${limit} config reads`);

    return read(dir);
  };

  vi.spyOn(configsByDir, 'get').mockImplementation(guardedRead);
};

const PERSISTENT_FACTS: TurboTaskFacts = { persistent: true };

const NOT_PERSISTENT_FACTS: TurboTaskFacts = { persistent: false };

/** P1's bare root keys, in key order: `lint`, `dev` and `serve` set `persistent: true`. */
const BARE_TASKS = new Map([
  ['lint', PERSISTENT_FACTS],
  ['build', NOT_PERSISTENT_FACTS],
  ['dev', PERSISTENT_FACTS],
  ['serve', PERSISTENT_FACTS],
  ['watch', NOT_PERSISTENT_FACTS]
]);

const P1_ROWS: PersistentRow[] = [
  ['@p/b#dev', true],
  ['@p/a#dev', false],
  ['@p/c#dev', true],
  ['d#watch', true],
  ['e#serve', false],
  ['d#serve', false]
];

const P1B_ROWS: PersistentRow[] = [
  ['@p/f#dev', false],
  ['g#lint', false],
  ['web1#lint', false],
  ['web1#start', true],
  ['web1#keep', false],
  ['web7#z2', false],
  ['web3#start', false],
  ['web4#start', true],
  ['web6#start', false],
  ['web6#keep', true]
];

const P1C_ROWS: PersistentRow[] = [
  ['web7#start', false],
  ['web8#start', true],
  ['web8#z3', false],
  ['web9#dev', true]
];

const P1D_ROWS: PersistentRow[] = [
  ['@p/b#dev', false],
  ['@p/c#dev', true],
  ['web9#dev', true]
];

describe('FEATURE: persistent of each task turbo defines for a package', () => {
  describe('GIVEN the P1, P1b and P1c probe workspace', () => {
    const lookup = lookupOf(P1_ROOT_TURBO_STUB, PERSISTENT_PACKAGES_STUB);

    it.each(P1_ROWS)('WHEN P1 task %s is resolved THEN persistent is %s', (id, expected) => {
      expect(persistentOf(lookup, id)).toBe(expected);
    });

    it.each(P1B_ROWS)('WHEN P1b task %s is resolved THEN persistent is %s', (id, expected) => {
      expect(persistentOf(lookup, id)).toBe(expected);
    });

    it.each(P1C_ROWS)('WHEN P1c task %s is resolved THEN persistent is %s', (id, expected) => {
      expect(persistentOf(lookup, id)).toBe(expected);
    });

    it('WHEN web3 and web4 list gp and base2 in both orders THEN only web3 keeps zap', () => {
      const zaps = [persistentOf(lookup, 'web3#zap'), persistentOf(lookup, 'web4#zap')];

      expect(zaps).toStrictEqual([false, undefined]);
    });

    it('WHEN web5 defines the zap its parent excludes THEN it keeps zap', () => {
      expect(persistentOf(lookup, 'web5#zap')).toBe(false);
    });

    it('WHEN d has no config and a d# root key THEN it reads the walk, not the shared bare tasks', () => {
      const bareTasks = lookup.root?.bareTasks;

      expect(tasksOf(lookup, 'd')).not.toBe(bareTasks);
    });

    it('WHEN a package with no config and no root key of its own is resolved THEN it gets the shared bare tasks', () => {
      const plain = fixturePackage('plain', null);
      const plainLookup = lookupOf(P1_ROOT_TURBO_STUB, [...PERSISTENT_PACKAGES_STUB, plain]);
      const bareTasks = plainLookup.root?.bareTasks;

      expect(tasksOf(plainLookup, 'plain')).toBe(bareTasks);
    });

    it('WHEN a package with no config and no root key of its own is resolved THEN the bare keys set persistent', () => {
      const plain = fixturePackage('plain', null);
      const plainLookup = lookupOf(P1_ROOT_TURBO_STUB, [...PERSISTENT_PACKAGES_STUB, plain]);

      const tasks = tasksOf(plainLookup, 'plain');

      expect(tasks).toStrictEqual(BARE_TASKS);
    });
  });

  describe('GIVEN the P1d root with a @p/b#dev key', () => {
    const lookup = lookupOf(P1D_ROOT_TURBO_STUB, PERSISTENT_PACKAGES_STUB);

    it.each(P1D_ROWS)('WHEN %s is resolved THEN persistent is %s', (id, expected) => {
      expect(persistentOf(lookup, id)).toBe(expected);
    });
  });

  describe('GIVEN a parent package with no config', () => {
    it('WHEN web11 extends @p/a and then nocfg THEN @p/a false is the last set value', () => {
      const nocfg = fixturePackage('nocfg', null);
      const web11 = fixturePackage('web11', '{"extends":["//","@p/a","nocfg"],"tasks":{}}');
      const packages = [...PERSISTENT_PACKAGES_STUB, nocfg, web11];
      const lookup = lookupOf(P1_ROOT_TURBO_STUB, packages);

      expect(persistentOf(lookup, 'web11#dev')).toBe(false);
    });
  });

  describe('GIVEN a root config with a //# key', () => {
    const lookup = lookupOf('{"tasks":{"//#fmt":{"persistent":true},"dev":{"persistent":true}}}', []);

    it('WHEN the root package is resolved THEN its //# task reads that key', () => {
      const root: TurboTaskPackage = { name: '//', path: '.' };

      const facts = turboTasksOf(lookup, root);

      expect(facts).toStrictEqual(new Map([['fmt', { persistent: true }]]));
    });
  });

  describe('GIVEN a task named like an Object.prototype member', () => {
    it('WHEN a package with a config is resolved THEN constructor reads its own entry only', () => {
      const pkg = fixturePackage('x', '{"extends":["//"],"tasks":{}}');
      const lookup = lookupOf('{"tasks":{"constructor":{}}}', [pkg]);

      expect(persistentOf(lookup, 'x#constructor')).toBe(false);
    });
  });

  describe('GIVEN two package configs that extend each other', () => {
    it('WHEN one is resolved THEN the cycle is cut and the other one value holds', () => {
      const cy1 = fixturePackage('cy1', '{"extends":["//","cy2"],"tasks":{"dev":{"persistent":true}}}');
      const cy2 = fixturePackage('cy2', '{"extends":["//","cy1"],"tasks":{"dev":{}}}');
      const lookup = lookupOf('{"tasks":{}}', [cy1, cy2]);

      expect(persistentOf(lookup, 'cy2#dev')).toBe(true);
    });
  });

  describe('GIVEN a config of the chain that did not parse', () => {
    it('WHEN the package is resolved THEN it cannot tell', () => {
      const broken = fixturePackage('x', '{');
      const lookup = lookupOf(P1_ROOT_TURBO_STUB, [broken]);

      expect(tasksOf(lookup, 'x')).toBeNull();
    });
  });

  describe('GIVEN a 12-level diamond of extends', () => {
    it(`WHEN the top package is resolved THEN each config is read under ${READS_PER_CONFIG} times`, () => {
      const lookup = lookupOf('{"tasks":{"dev":{}}}', diamondPackages(12));
      const reads = vi.spyOn(lookup.configsByDir, 'get');
      const limit = READS_PER_CONFIG * lookup.configsByDir.size;

      tasksOf(lookup, 'a11');

      expect(reads.mock.calls.length).toBeLessThan(limit);
    });
  });

  describe('GIVEN a 30-level diamond of extends', () => {
    it('WHEN the top package is resolved THEN it ends within the read bound with the bottom value', () => {
      const lookup = lookupOf('{"tasks":{"dev":{}}}', diamondPackages(30));

      guardReads(lookup);

      expect(persistentOf(lookup, 'a29#dev')).toBe(true);
    });
  });
});
