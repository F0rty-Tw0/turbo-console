import { describe, expect, it } from 'vitest';

import { turboOptionArgs, turboRunAllArgs, turboRunArgs } from './run-args.util.ts';
import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';
import type { RunTaskOptions } from '../common/run-args.type.ts';

const TASK_NODE: TaskNode = {
  id: '@fx/pkg-001#build',
  name: 'build',
  command: null,
  description: null,
  tags: [],
  dependencies: [],
  kind: 'task',
  atom: null,
  isTurboTask: true,
  persistent: false
};

const PLAIN_ARGS = ['--skip-infer', 'run', 'build', '--filter=@fx/pkg-001', '--summarize'];

const ROOT_ARGS = ['--skip-infer', 'run', 'build', '--filter=//', '--summarize'];

const ALL: RunTaskOptions = {
  force: true,
  only: true,
  continueMode: 'dependencies-successful',
  concurrency: '50%',
  passThrough: ['--watch']
};

const ALL_WORDS = ['--force', '--only', '--continue=dependencies-successful', '--concurrency=50%', '--', '--watch'];

/** Spec §5 table: label, options, the words after the base. */
const PICKS: [string, RunTaskOptions, string[]][] = [
  ['none', { force: false }, []],
  ['Without cache', { force: true }, ['--force']],
  ['Only this task', { force: false, only: true }, ['--only']],
  ['Keep going', { force: false, continueMode: 'dependencies-successful' }, ['--continue=dependencies-successful']],
  ['Concurrency 4', { force: false, concurrency: '4' }, ['--concurrency=4']],
  ['Extra --watch --port=3000', { force: false, passThrough: ['--watch', '--port=3000'] }, ['--', '--watch', '--port=3000']],
  ['Extra left blank', { force: false, passThrough: [] }, []],
  ['all five', ALL, ALL_WORDS]
];

const BAD_CONCURRENCY = ['0', '01', '-1', 'abc', '1.5', '0%', '', ' 2'];

const GOOD_CONCURRENCY = ['1', '50%', '150%'];

const BAD_ARGS = ['a b', '$HOME', "it's", 'a,b', '@scope/x', '=x', '', 'a\n'];

describe('FEATURE: turbo run arguments', () => {
  describe('GIVEN one task of one package', () => {
    it('WHEN the arguments are built THEN they run the task filtered to the package with a summary', () => {
      const args = turboRunArgs(TASK_NODE, '@fx/pkg-001');

      expect(args).toStrictEqual(PLAIN_ARGS);
    });

    it('WHEN force is false THEN the arguments are the plain run', () => {
      const args = turboRunArgs(TASK_NODE, '@fx/pkg-001', { force: false });

      expect(args).toStrictEqual(PLAIN_ARGS);
    });

    it('WHEN force is true THEN --force is added after --summarize', () => {
      const args = turboRunArgs(TASK_NODE, '@fx/pkg-001', { force: true });

      expect(args).toStrictEqual([...PLAIN_ARGS, '--force']);
    });

    it('WHEN singlePackage is true THEN --single-package follows --summarize', () => {
      const args = turboRunArgs(TASK_NODE, '@fx/pkg-001', { force: false }, true);

      expect(args).toStrictEqual([...PLAIN_ARGS, '--single-package']);
    });

    it('WHEN singlePackage and force are both true THEN --force stays last', () => {
      const args = turboRunArgs(TASK_NODE, '@fx/pkg-001', { force: true }, true);

      expect(args).toStrictEqual([...PLAIN_ARGS, '--single-package', '--force']);
    });

    it.each(PICKS)('WHEN the picks are %s THEN the words follow the base in the fixed order', (_label, options, words) => {
      expect(turboRunArgs(TASK_NODE, '@fx/pkg-001', options)).toStrictEqual([...PLAIN_ARGS, ...words]);
    });

    it('WHEN the task is the root //#build with all five THEN the base filters to // and no --single-package is added', () => {
      const root = { ...TASK_NODE, id: '//#build' };

      expect(turboRunArgs(root, '//', ALL)).toStrictEqual([...ROOT_ARGS, ...ALL_WORDS]);
    });

    it('WHEN singlePackage and all five are set THEN --single-package comes before --force', () => {
      const root = { ...TASK_NODE, id: '//#build' };

      expect(turboRunArgs(root, '//', ALL, true)).toStrictEqual([...ROOT_ARGS, '--single-package', ...ALL_WORDS]);
    });

    it('WHEN passThrough holds four args THEN they follow -- verbatim', () => {
      const passThrough = ['--watch', '--port=3000', './src/a.ts', '--env=dev:local'];

      expect(turboRunArgs(TASK_NODE, '@fx/pkg-001', { force: false, passThrough })).toStrictEqual([
        ...PLAIN_ARGS,
        '--',
        ...passThrough
      ]);
    });

    it.each(GOOD_CONCURRENCY)('WHEN concurrency is %j THEN it is passed as --concurrency=<value>', (value) => {
      expect(turboRunArgs(TASK_NODE, '@fx/pkg-001', { force: false, concurrency: value })).toStrictEqual([
        ...PLAIN_ARGS,
        `--concurrency=${value}`
      ]);
    });

    it.each(BAD_CONCURRENCY)('WHEN concurrency is %j THEN it throws invalid-argument', (value) => {
      expect(() => turboRunArgs(TASK_NODE, '@fx/pkg-001', { force: false, concurrency: value })).toThrow(
        expect.objectContaining({ kind: 'invalid-argument' })
      );
    });

    it.each(BAD_ARGS)('WHEN a pass-through arg is %j THEN it throws invalid-argument', (arg) => {
      expect(() => turboRunArgs(TASK_NODE, '@fx/pkg-001', { force: false, passThrough: ['--ok', arg] })).toThrow(
        expect.objectContaining({ kind: 'invalid-argument' })
      );
    });

    it('WHEN turboOptionArgs gets a bad arg THEN it builds the words with no check', () => {
      expect(turboOptionArgs({ force: true, passThrough: ['a b'] })).toStrictEqual(['--force', '--', 'a b']);
    });

    it('WHEN the task name holds spaces and brackets THEN it is accepted', () => {
      const args = turboRunArgs({ ...TASK_NODE, name: 'my task[1]' }, 'pkg');

      expect(args).toContain('my task[1]');
    });

    it('WHEN the task name looks like a flag THEN it throws invalid-argument', () => {
      expect(() => turboRunArgs({ ...TASK_NODE, name: '-x' }, 'pkg')).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });

    it('WHEN the task name holds a # THEN it throws invalid-argument', () => {
      expect(() => turboRunArgs({ ...TASK_NODE, name: 'b#build' }, 'p#b')).toThrow(
        expect.objectContaining({ kind: 'invalid-argument' })
      );
    });

    it('WHEN the package name is a glob THEN it throws invalid-argument', () => {
      expect(() => turboRunArgs(TASK_NODE, 'a*')).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });
  });

  describe('GIVEN a task name run across all packages', () => {
    it('WHEN affected is false THEN the arguments are the bare run', () => {
      expect(turboRunAllArgs('lint', { affected: false })).toStrictEqual(['--skip-infer', 'run', 'lint']);
    });

    it('WHEN affected is true THEN --affected is added', () => {
      expect(turboRunAllArgs('lint', { affected: true })).toStrictEqual(['--skip-infer', 'run', 'lint', '--affected']);
    });

    it('WHEN singlePackage is true THEN --single-package is added', () => {
      expect(turboRunAllArgs('lint', { affected: false }, true)).toStrictEqual(['--skip-infer', 'run', 'lint', '--single-package']);
    });

    it('WHEN singlePackage and affected are both true THEN both flags are added', () => {
      const args = turboRunAllArgs('lint', { affected: true }, true);

      expect(args).toStrictEqual(['--skip-infer', 'run', 'lint', '--affected', '--single-package']);
    });

    it('WHEN the name holds a # THEN it throws invalid-argument', () => {
      expect(() => turboRunAllArgs('b#deploy', { affected: false })).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });

    it('WHEN the name is a flag THEN it throws invalid-argument', () => {
      expect(() => turboRunAllArgs('--force', { affected: false })).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });
  });
});
