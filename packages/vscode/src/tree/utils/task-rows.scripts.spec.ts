import type { PackageManager, PackageManagerSource, PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it, vi } from 'vitest';

import { scriptRows } from './script-rows.util.ts';
import { taskRowOf, taskRows } from './task-rows.util.ts';
import type { LiveIds } from '../../run/common/run.type.ts';
import type { IconSpec, RowScope, TreeRow } from '../common/tree-row.type.ts';
import { PACKAGE_NODE_STUB, ROW_SCOPE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { liveIdsOf } from '../test/utils/live-ids.spec.util.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const scriptOf = (name: string, overrides: Partial<TaskNode> = {}): TaskNode => {
  const script: TaskNode = { ...TASK_NODE_STUB, id: `a#${name}`, name, command: `node ${name}.js`, isTurboTask: false, ...overrides };

  return script;
};

const packageWith = (tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks };

  return pkg;
};

const BUILD: TaskNode = { ...TASK_NODE_STUB, id: 'a#build' };

const MIXED = packageWith([BUILD, scriptOf('lint'), scriptOf('bad name'), scriptOf('a-first')]);

const SHOWN = rowContextOf('list', undefined, false, { scriptsShown: true, live: liveIdsOf('/ws') });

const HIDDEN = rowContextOf('list');

const hiddenWithLive = (root: string, ...ids: string[]): ReturnType<typeof rowContextOf> => {
  const live = liveIdsOf(root, ...ids);

  return rowContextOf('list', undefined, false, { scriptsShown: false, live });
};

const keysOf = (rows: TreeRow[]): string[] => rows.map((row) => row.key);

const scopeWith = (source: PackageManagerSource, name: PackageManager['name'] = 'pnpm'): RowScope => {
  const packageManager: PackageManager = { name, source };
  const scope: RowScope = { ...ROW_SCOPE_STUB, packageManager };

  return scope;
};

describe('FEATURE: the Scripts group of a package', () => {
  describe('GIVEN scripts shown and a package with a turbo task and three scripts', () => {
    it('WHEN its task rows are listed THEN the turbo task comes first and the group follows, holding no script row', () => {
      const rows = taskRows(ROW_SCOPE_STUB, MIXED, SHOWN);

      expect(rows.map((row) => [row.kind, row.key])).toStrictEqual([
        ['task', 'a#build'],
        ['scripts', 'a']
      ]);
    });

    it('WHEN the group is built THEN it is a collapsed Scripts row counting its scripts with the turboGroup value', () => {
      const group = taskRows(ROW_SCOPE_STUB, MIXED, SHOWN).at(-1);

      const icon: IconSpec = { id: 'symbol-namespace', color: null };

      expect(group).toStrictEqual({
        id: 'scripts:/ws\0a',
        kind: 'scripts',
        root: '/ws',
        key: 'a',
        packageName: 'a',
        label: 'Scripts',
        description: '3',
        icon,
        contextValue: 'turboGroup',
        collapsible: 'collapsed',
        tooltip: ['Runs with pnpm (from packageManager)'],
        command: null
      });
    });

    it('WHEN the scope root differs from the model root THEN the group id and root follow the scope', () => {
      const scope: RowScope = { ...ROW_SCOPE_STUB, root: '/other' };
      const group = taskRows(
        scope,
        MIXED,
        rowContextOf('list', undefined, false, { scriptsShown: true, live: liveIdsOf('/other') })
      ).at(-1);

      expect([group?.id, group?.root]).toStrictEqual(['scripts:/other\0a', '/other']);
    });

    it('WHEN the scripts are listed THEN they come sorted by name, the refused one included', () => {
      const rows = scriptRows(ROW_SCOPE_STUB, MIXED, SHOWN);

      expect(keysOf(rows)).toStrictEqual(['a#a-first', 'a#bad name', 'a#lint']);
    });

    it('WHEN a script row is built THEN it is a task row with the turboScript value and its package', () => {
      const [first] = scriptRows(ROW_SCOPE_STUB, MIXED, SHOWN);

      expect(first).toMatchObject({
        id: 'task:/ws\0a#a-first',
        kind: 'task',
        packageName: 'a',
        contextValue: 'turboScript',
        collapsible: 'none'
      });
    });

    it('WHEN a script has a refused name THEN its row stays and its tooltip names no run command', () => {
      const row = scriptRows(ROW_SCOPE_STUB, MIXED, SHOWN).find((each) => each.key === 'a#bad name');

      expect(row?.tooltip).toStrictEqual(['Script: node bad name.js', 'Kind: task']);
    });

    it('WHEN its rows are listed THEN the run store is not asked and the rows are unchanged', () => {
      const live = vi.fn<LiveIds>(() => new Set(['a#lint']));
      const context = rowContextOf('list', undefined, false, { scriptsShown: true, live });
      const turboRows = taskRows(ROW_SCOPE_STUB, MIXED, context);
      const heldRows = scriptRows(ROW_SCOPE_STUB, MIXED, context);
      const rows = [...turboRows, ...heldRows];

      expect([live.mock.calls.length, keysOf(rows)]).toStrictEqual([0, ['a#build', 'a', 'a#a-first', 'a#bad name', 'a#lint']]);
    });

    it('WHEN a script is looked up by id THEN taskRowOf still finds it under its unchanged id', () => {
      const row = taskRowOf(ROW_SCOPE_STUB, MIXED, 'a#lint', SHOWN);

      expect(row?.id).toBe('task:/ws\0a#lint');
    });
  });

  describe('GIVEN each package manager source', () => {
    it.each<[string, PackageManagerSource, PackageManager['name'], string]>([
      ['the packageManager field', { kind: 'field' }, 'pnpm', 'Runs with pnpm (from packageManager)'],
      ['the devEngines field', { kind: 'devEngines' }, 'yarn', 'Runs with yarn (from devEngines)'],
      ['a lockfile', { kind: 'lockfile', file: 'pnpm-lock.yaml' }, 'pnpm', 'Runs with pnpm (from pnpm-lock.yaml)'],
      ['the default', { kind: 'default' }, 'npm', 'Runs with npm (default)']
    ])('WHEN the manager came from %s THEN the group tooltip reads %s', (_label, source, name, line) => {
      const group = taskRows(scopeWith(source, name), MIXED, SHOWN).at(-1);

      expect(group?.tooltip).toStrictEqual([line]);
    });
  });

  describe('GIVEN scripts shown and a package without a visible script', () => {
    it('WHEN it has only turbo tasks THEN there is no group', () => {
      const rows = taskRows(ROW_SCOPE_STUB, packageWith([BUILD]), SHOWN);

      expect(keysOf(rows)).toStrictEqual(['a#build']);
    });

    it('WHEN its only script is an atom file THEN there is no group and no script row', () => {
      const pkg = packageWith([BUILD, scriptOf('atom', { kind: 'atom-file' })]);

      expect([keysOf(taskRows(ROW_SCOPE_STUB, pkg, SHOWN)), scriptRows(ROW_SCOPE_STUB, pkg, SHOWN)]).toStrictEqual([['a#build'], []]);
    });
  });

  describe('GIVEN a package with only scripts', () => {
    it('WHEN scripts are shown THEN its task rows are the group alone', () => {
      const rows = taskRows(ROW_SCOPE_STUB, packageWith([scriptOf('lint')]), SHOWN);

      expect(keysOf(rows)).toStrictEqual(['a']);
    });
  });

  describe('GIVEN scripts hidden', () => {
    it('WHEN no script is live THEN there is no group and no script row', () => {
      expect([keysOf(taskRows(ROW_SCOPE_STUB, MIXED, HIDDEN)), scriptRows(ROW_SCOPE_STUB, MIXED, HIDDEN)]).toStrictEqual([
        ['a#build'],
        []
      ]);
    });

    it('WHEN one script is live THEN the group appears counting 1 and holds only the live row', () => {
      const context = hiddenWithLive('/ws', 'a#lint');
      const rows = taskRows(ROW_SCOPE_STUB, MIXED, context);

      expect([keysOf(rows), rows.at(-1)?.description, keysOf(scriptRows(ROW_SCOPE_STUB, MIXED, context))]).toStrictEqual([
        ['a#build', 'a'],
        '1',
        ['a#lint']
      ]);
    });

    it('WHEN the live id is a turbo task THEN there is no group', () => {
      const rows = taskRows(ROW_SCOPE_STUB, MIXED, hiddenWithLive('/ws', 'a#build'));

      expect(keysOf(rows)).toStrictEqual(['a#build']);
    });

    it('WHEN the script is live only under another folder root THEN there is no group', () => {
      const rows = taskRows(ROW_SCOPE_STUB, MIXED, hiddenWithLive('/other', 'a#lint'));

      expect(keysOf(rows)).toStrictEqual(['a#build']);
    });

    it('WHEN the live script row is looked up by id THEN it keeps its task id', () => {
      const row = taskRowOf(ROW_SCOPE_STUB, MIXED, 'a#lint', hiddenWithLive('/ws', 'a#lint'));

      expect(row?.id).toBe('task:/ws\0a#lint');
    });
  });
});
