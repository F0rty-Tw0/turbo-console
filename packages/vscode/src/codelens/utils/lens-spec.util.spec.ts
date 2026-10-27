import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { lensSpecOf } from './lens-spec.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { LENS_TEXT_MAX } from '../common/codelens.const.ts';
import type { LensSpec } from '../common/codelens.type.ts';

const FILE = '/ws/packages/a/package.json';

const TEXT = '{\n  "name": "a",\n  "scripts": {\n    "build": "tsc"\n  }\n}\n';

const taskNamed = (name: string, isTurboTask = true): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `a#${name}`, name, isTurboTask };

  return task;
};

const stateOf = (tasks: TaskNode[]): RootState => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks };
  const model: RootState['model'] = { ...WORKSPACE_MODEL_STUB, packages: [pkg] };
  const state: RootState = { ...ROOT_STATE_STUB, model };

  return state;
};

const titleOf = (spec: LensSpec | null): string | undefined => spec?.title;

const lineOf = (text: string): number | undefined => lensSpecOf(text, FILE, stateOf([taskNamed('build')]), false)?.line;

/** A manifest with `"scripts"` on line 1, padded with trailing spaces to `length` UTF-16 units. */
const paddedTo = (length: number): string => '{\n  "scripts": {}\n}'.padEnd(length, ' ');

describe('FEATURE: lens spec of a package.json (spec 1c-b §4.11)', () => {
  describe('GIVEN a package with turbo tasks', () => {
    it('WHEN it has more than 3 THEN the title names the first 3 in picker order, then "…" and the count', () => {
      const names = ['test', 'typecheck', 'lint', 'build', 'zeta'];
      const state = stateOf(names.map((name) => taskNamed(name)));

      expect(titleOf(lensSpecOf(TEXT, FILE, state, false))).toBe('▷ Tasks: build, lint, test, … (5)');
    });

    it('WHEN it has exactly 3 THEN the title has no "…"', () => {
      const names = ['c', 'a', 'b'];
      const state = stateOf(names.map((name) => taskNamed(name)));

      expect(titleOf(lensSpecOf(TEXT, FILE, state, false))).toBe('▷ Tasks: a, b, c (3)');
    });

    it('WHEN it has 1 THEN the title names it and counts 1', () => {
      const state = stateOf([taskNamed('build')]);

      expect(titleOf(lensSpecOf(TEXT, FILE, state, false))).toBe('▷ Tasks: build (1)');
    });

    it('WHEN a name holds $( THEN the title escapes it', () => {
      const state = stateOf([taskNamed('$(x)')]);

      expect(titleOf(lensSpecOf(TEXT, FILE, state, false))).toBe('▷ Tasks: \\$(x) (1)');
    });

    it('WHEN a name holds a line break THEN the title shows it cleaned to a space', () => {
      const state = stateOf([taskNamed('a\nb')]);

      expect(titleOf(lensSpecOf(TEXT, FILE, state, false))).toBe('▷ Tasks: a b (1)');
    });

    it('WHEN the root has a load error but kept its model THEN the lens stays', () => {
      const loaded = stateOf([taskNamed('build')]);
      const error: LoadFailure = { ...LOAD_FAILURE_STUB, stage: 'load' };
      const state: RootState = { ...loaded, error };

      expect(titleOf(lensSpecOf(TEXT, FILE, state, false))).toBe('▷ Tasks: build (1)');
    });
  });

  describe('GIVEN a package with a turbo task, a safe script and a refused script', () => {
    const state = stateOf([taskNamed('lint'), taskNamed('zap', false), taskNamed('a b', false)]);

    it('WHEN scripts are hidden THEN only the turbo task counts', () => {
      expect(titleOf(lensSpecOf(TEXT, FILE, state, false))).toBe('▷ Tasks: lint (1)');
    });

    it('WHEN scripts are shown THEN the safe script counts after the turbo task, the refused one never', () => {
      expect(titleOf(lensSpecOf(TEXT, FILE, state, true))).toBe('▷ Tasks: lint, zap (2)');
    });
  });

  describe('GIVEN a package whose script sorts before its turbo task', () => {
    it('WHEN scripts are shown THEN the turbo task still comes first, in picker order', () => {
      const state = stateOf([taskNamed('zeta'), taskNamed('alpha', false)]);

      expect(titleOf(lensSpecOf(TEXT, FILE, state, true))).toBe('▷ Tasks: zeta, alpha (2)');
    });
  });

  describe('GIVEN nothing to act on', () => {
    it('WHEN the package has only scripts and they are hidden THEN there is no lens', () => {
      const state = stateOf([taskNamed('zap', false)]);

      expect(lensSpecOf(TEXT, FILE, state, false)).toBeNull();
    });

    it('WHEN the package has only a refused script and scripts are shown THEN there is no lens', () => {
      const state = stateOf([taskNamed('a b', false)]);

      expect(lensSpecOf(TEXT, FILE, state, true)).toBeNull();
    });

    it('WHEN the root has no state THEN there is no lens', () => {
      expect(lensSpecOf(TEXT, FILE, undefined, false)).toBeNull();
    });

    it('WHEN the root has no model THEN there is no lens', () => {
      const state: RootState = { ...ROOT_STATE_STUB, model: null };

      expect(lensSpecOf(TEXT, FILE, state, false)).toBeNull();
    });

    it('WHEN the root is in a binary error THEN there is no lens, a kept model included', () => {
      const loaded = stateOf([taskNamed('build')]);
      const state: RootState = { ...loaded, error: LOAD_FAILURE_STUB };

      expect(lensSpecOf(TEXT, FILE, state, false)).toBeNull();
    });

    it('WHEN no package owns the file THEN there is no lens', () => {
      const state = stateOf([taskNamed('build')]);

      expect(lensSpecOf(TEXT, '/ws/packages/other/package.json', state, false)).toBeNull();
    });

    it('WHEN the file is the root manifest of a monorepo model THEN there is no lens (V5: the model holds no "//")', () => {
      const state = stateOf([taskNamed('build')]);

      expect(lensSpecOf(TEXT, '/ws/package.json', state, true)).toBeNull();
    });

    it('WHEN the file is the root manifest of a single-package model THEN the lens names its tasks', () => {
      const root: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', label: 'single-app', tasks: [taskNamed('build')] };
      const model: RootState['model'] = { ...WORKSPACE_MODEL_STUB, singlePackage: true, packages: [root] };
      const state: RootState = { ...ROOT_STATE_STUB, model };

      expect(titleOf(lensSpecOf(TEXT, '/ws/package.json', state, false))).toBe('▷ Tasks: build (1)');
    });
  });

  describe('GIVEN the text of the manifest', () => {
    it('WHEN "scripts" is on line 4 and its { on line 5 THEN the lens sits on line 4', () => {
      const text = '{\n  "name": "a",\n  "version": "1.0.0",\n  "private": true,\n  "scripts":\n  {\n    "build": "tsc"\n  }\n}\n';

      expect(lineOf(text)).toBe(4);
    });

    it('WHEN the top level has no "scripts" key THEN the lens sits on line 0', () => {
      expect(lineOf('{\n  "name": "a"\n}\n')).toBe(0);
    });

    it('WHEN "scripts" is only nested in another key THEN the lens stays on line 0', () => {
      expect(lineOf('{\n  "x": {\n    "scripts": {}\n  }\n}\n')).toBe(0);
    });

    it('WHEN "scripts" is repeated THEN the lens sits on the last one, the one npm reads', () => {
      expect(lineOf('{\n  "scripts": {},\n  "scripts": {}\n}\n')).toBe(2);
    });

    it('WHEN the text has a trailing comma THEN the lens still sits on the "scripts" key line', () => {
      expect(lineOf('{\n  "scripts": {\n    "build": "tsc",\n  },\n}\n')).toBe(1);
    });

    it('WHEN the text is cut off inside the scripts THEN the lens sits on the "scripts" key line', () => {
      expect(lineOf('{\n  "name": "a",\n  "scripts": {\n    "build": ')).toBe(2);
    });

    it('WHEN the text is empty THEN the lens sits on line 0', () => {
      expect(lineOf('')).toBe(0);
    });

    it('WHEN the top level is no object THEN the lens sits on line 0', () => {
      expect(lineOf('[{ "scripts": {} }]')).toBe(0);
    });

    it('WHEN the text uses CRLF THEN the lens sits on the key line', () => {
      expect(lineOf('{\r\n  "name": "a",\r\n  "scripts": {}\r\n}\r\n')).toBe(2);
    });

    it('WHEN the text uses lone CR THEN the lens sits on the key line', () => {
      expect(lineOf('{\r  "name": "a",\r  "scripts": {}\r}\r')).toBe(2);
    });

    it('WHEN the text nests deep enough to overflow the parser stack THEN the lens sits on line 0', () => {
      const text = `{\n  "scripts": {},\n  "x": ${'['.repeat(10_000)}`;

      expect(lineOf(text)).toBe(0);
    });

    it('WHEN the text is exactly at the size cap THEN the lens still sits on the key line', () => {
      expect(lineOf(paddedTo(LENS_TEXT_MAX))).toBe(1);
    });

    it('WHEN the text is one unit over the size cap THEN it is not parsed and the lens sits on line 0', () => {
      expect(lineOf(paddedTo(LENS_TEXT_MAX + 1))).toBe(0);
    });
  });
});
