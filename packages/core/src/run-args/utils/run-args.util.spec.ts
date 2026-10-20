import { describe, expect, it } from 'vitest';

import { turboRunAllArgs, turboRunArgs } from './run-args.util.ts';
import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';

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
