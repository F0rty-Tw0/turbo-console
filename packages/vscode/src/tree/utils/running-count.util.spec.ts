import type { PackageNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { parentDirsOf, runningCountsOf, withRunningSuffix } from './running-count.util.ts';
import type { LiveIds, RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { ModelView } from '../common/model-view.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { RunningCounts } from '../common/tree-row.type.ts';
import { PACKAGE_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { modelViewWith, rowContextOf } from '../test/utils/row-context.spec.util.ts';

const packageAt = (name: string, path: string): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path };

  return pkg;
};

/**
 * `packages/apps/web` keeps `packages` a folder of its own (a single-child chain would compress), and `packages/app/x`
 * makes `packages/app` a folder whose path is also the path of package app.
 */
const VIEW: ModelView = modelViewWith([
  packageAt('app', 'packages/app'),
  packageAt('appx', 'packages/app/x'),
  packageAt('web', 'packages/apps/web'),
  packageAt('win', 'packages\\win'),
  packageAt('abx', 'ab/x'),
  packageAt('ay', 'a/y')
]);

const runOf = (root: string, packageName: string, state: RunEntry['state'] = 'running'): RunEntry => {
  const taskId = `${packageName}#build`;
  const entry: RunEntry = { ...RUN_ENTRY_STUB, root, taskId, packageName, state };

  return entry;
};

/** A context over `entries` as the run store holds them: `live` lists the running ids of each root. */
const contextOf = (entries: RunEntry[]): RowContext => {
  const runs: RunLookup = (root, taskId) => entries.find((entry) => entry.root === root && entry.taskId === taskId);
  const idsOf = (root: string): ReadonlySet<string> => {
    const running = entries.filter((entry) => entry.root === root && entry.state === 'running');

    return new Set(running.map((entry) => entry.taskId));
  };
  const live: LiveIds = idsOf;

  return rowContextOf('folders', runs, false, { scriptsShown: false, live });
};

const APP_BUILD = runOf('/ws', 'app');

const APP_TEST: RunEntry = { ...APP_BUILD, taskId: 'app#test' };

const countsOf = (entries: RunEntry[]): RunningCounts => runningCountsOf('/ws', VIEW, contextOf(entries));

describe('FEATURE: running counts of package and folder rows', () => {
  describe('GIVEN two runs of package app at packages/app', () => {
    const counts = countsOf([APP_BUILD, APP_TEST]);

    it('WHEN counted THEN the package counts 2', () => {
      expect(counts.packages.get('app')).toBe(2);
    });

    it('WHEN counted THEN its folder packages counts 2', () => {
      expect(counts.dirs.get('packages')).toBe(2);
    });

    it('WHEN counted THEN folder packages/app does not count it, as the package sits in packages', () => {
      expect([VIEW.packagesBelow.has('packages/app'), counts.dirs.has('packages/app')]).toStrictEqual([true, false]);
    });
  });

  describe('GIVEN a run of package web at packages/apps/web', () => {
    it('WHEN counted THEN every folder above it counts it', () => {
      const counts = countsOf([runOf('/ws', 'web')]);

      expect([counts.dirs.get('packages'), counts.dirs.get('packages/apps')]).toStrictEqual([1, 1]);
    });
  });

  describe('GIVEN a run of package abx at ab/x', () => {
    it('WHEN counted THEN folder ab counts it and folder a does not', () => {
      const counts = countsOf([runOf('/ws', 'abx')]);

      expect([counts.dirs.get('ab'), counts.dirs.has('a')]).toStrictEqual([1, false]);
    });
  });

  describe('GIVEN a run of package win at the backslash path packages\\win', () => {
    it('WHEN counted THEN its posix folder packages counts it', () => {
      const counts = countsOf([runOf('/ws', 'win')]);

      expect(counts.dirs.get('packages')).toBe(1);
    });
  });

  describe('GIVEN an ended run and a run of another root', () => {
    it('WHEN counted THEN neither counts', () => {
      const counts = countsOf([runOf('/ws', 'app', 'passed'), runOf('/other', 'app')]);

      expect([counts.packages.size, counts.dirs.size]).toStrictEqual([0, 0]);
    });
  });

  describe('GIVEN a run of a package gone from the view', () => {
    it('WHEN counted THEN no folder counts it', () => {
      const counts = countsOf([runOf('/ws', 'gone')]);

      expect(counts.dirs.size).toBe(0);
    });
  });
});

/** A context whose `live` answers `held` as the run store does: the same Set object until the running ids change. */
const contextHolding = (held: ReadonlySet<string>, entries: RunEntry[]): RowContext => {
  const runs: RunLookup = (root, taskId) => entries.find((entry) => entry.root === root && entry.taskId === taskId);
  const live: LiveIds = () => held;

  return rowContextOf('folders', runs, false, { scriptsShown: false, live });
};

describe('FEATURE: running counts memoized per view and live set', () => {
  const HELD = new Set([APP_BUILD.taskId]);
  const context = contextHolding(HELD, [APP_BUILD]);

  describe('GIVEN the same view and the same live Set', () => {
    it('WHEN counted twice THEN both answers are the one counts object', () => {
      const first = runningCountsOf('/ws', VIEW, context);
      const second = runningCountsOf('/ws', VIEW, context);

      expect(second).toBe(first);
    });
  });

  describe('GIVEN the same view and a new live Set', () => {
    it('WHEN counted again THEN the counts are recomputed from the new Set', () => {
      const before = runningCountsOf('/ws', VIEW, context);
      const grown = contextHolding(new Set([APP_BUILD.taskId, APP_TEST.taskId]), [APP_BUILD, APP_TEST]);
      const next: RowContext = { ...grown, countsMemo: context.countsMemo };
      const after = runningCountsOf('/ws', VIEW, next);

      expect([after === before, before.packages.get('app'), after.packages.get('app')]).toStrictEqual([false, 1, 2]);
    });
  });

  describe('GIVEN another view and the same live Set', () => {
    it('WHEN counted THEN the counts are recomputed for that view', () => {
      const other = modelViewWith([packageAt('app', 'packages/app')]);
      const first = runningCountsOf('/ws', VIEW, context);
      const second = runningCountsOf('/ws', other, context);

      expect(second).not.toBe(first);
    });
  });
});

describe('FEATURE: running suffix of a row description', () => {
  it.each([
    ['packages/app', 2, 'packages/app · 2 running'],
    ['', 2, '2 running'],
    ['x', 0, 'x'],
    ['', 0, '']
  ])('GIVEN %j and %i runs WHEN suffixed THEN it reads %j', (description, count, expected) => {
    const text = withRunningSuffix(description, count);

    expect(text).toBe(expected);
  });
});

describe('FEATURE: folders above a package path', () => {
  it.each([
    ['packages/apps/web', ['packages', 'packages/apps']],
    ['packages\\win', ['packages']],
    ['./a//b', ['a']],
    ['top', []],
    ['', []]
  ])('GIVEN the path %j WHEN split THEN the folders are %j', (path, expected) => {
    const dirs = parentDirsOf(path);

    expect(dirs).toStrictEqual(expected);
  });
});
