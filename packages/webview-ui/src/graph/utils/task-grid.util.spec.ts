import { describe, expect, it } from 'vitest';

import { folderKeyOf, projectKeyOf, taskGridLinesOf } from './task-grid.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { GroupState } from '../common/graph-controls.type.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import type { GroupLine, ProjectLine, TaskGridFacts, TaskGridOpen, TaskLine } from '../common/task-grid.type.ts';
import { GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';
import {
  GRID_FLAT_NAMING_STUB,
  GRID_GROUPED_NAMING_STUB,
  GRID_TASKS_STUB,
  TASK_GRID_FACTS_STUB
} from '../test/stubs/task-grid.stub.ts';

const taskOf = (packageName: string, name: string): GraphTask => {
  const task: GraphTask = { ...GRAPH_TASK_STUB, id: `${packageName}#${name}`, packageName, name };

  return task;
};

const TASKS = GRID_TASKS_STUB;
const FLAT = GRID_FLAT_NAMING_STUB;
const GROUPED = GRID_GROUPED_NAMING_STUB;
const FACTS = TASK_GRID_FACTS_STUB;
const CLOSED: TaskGridOpen = { toggled: new Set(), search: '' };

const textOf = (line: ProjectLine): string => (line.kind === 'task' ? line.task.id : line.text);

const textsOf = (lines: ProjectLine[]): string[] => lines.map(textOf);

const groupOf = (lines: ProjectLine[], text: string): GroupLine => {
  const found = lines.find((line): line is GroupLine => line.kind !== 'task' && line.text === text);

  if (found === undefined) throw new Error(`no group line ${text}`);

  return found;
};

const taskLineOf = (lines: ProjectLine[], id: string): TaskLine => {
  const found = lines.find((line): line is TaskLine => line.kind === 'task' && line.task.id === id);

  if (found === undefined) throw new Error(`no task line ${id}`);

  return found;
};

const openWith = (...keys: string[]): TaskGridOpen => {
  const open: TaskGridOpen = { toggled: new Set(keys), search: '' };

  return open;
};

describe('FEATURE: taskGridLinesOf', () => {
  describe('GIVEN a flat monorepo', () => {
    it('WHEN lines are built THEN projects read the root first, then by code unit, with no task line', () => {
      const lines = taskGridLinesOf(FACTS, CLOSED);

      expect(textsOf(lines)).toStrictEqual(['Workspace root (//) (1)', '-tools (1)', 'core (1)', 'root-lib (1)', 'ui (2)', 'web (2)']);
      expect(lines.map((line) => line.kind)).toStrictEqual(Array(6).fill('project'));
      expect(lines.map((line) => line.depth)).toStrictEqual(Array(6).fill(0));
    });

    it('WHEN web is toggled open THEN its two task lines follow it at depth 1 and the others stay collapsed', () => {
      const lines = taskGridLinesOf(FACTS, openWith(projectKeyOf('web')));

      expect(textsOf(lines).slice(-3)).toStrictEqual(['web (2)', 'web#build', 'web#dev']);
      expect(taskLineOf(lines, 'web#build').depth).toBe(1);
      expect(groupOf(lines, 'web (2)').isOpen).toBe(true);
      expect(groupOf(lines, 'ui (2)').isOpen).toBe(false);
    });

    it('WHEN a package has no pool task THEN it has no line', () => {
      const facts: TaskGridFacts = { ...FACTS, tasks: TASKS.filter((task) => task.packageName !== 'core') };

      const lines = taskGridLinesOf(facts, CLOSED);

      expect(textsOf(lines)).not.toContain('core (1)');
    });

    it('WHEN scope-hidden labels name @org/app as app THEN the project reads app (1) with the labelled checks', () => {
      const labels = new Map([['@org/app', 'app']]);
      const tasks = [taskOf('@org/app', 'build')];
      const naming: TaskNaming = { ...FLAT, labels };
      const facts: TaskGridFacts = { ...FACTS, tasks, naming };

      const lines = taskGridLinesOf(facts, openWith(projectKeyOf('@org/app')));

      expect(groupOf(lines, 'app (1)').label).toBe('Choose tasks of app');
      expect(taskLineOf(lines, '@org/app#build').label).toBe('Choose @org/app#build');
    });
  });

  describe('GIVEN a grouped monorepo', () => {
    const grouped: TaskGridFacts = { ...FACTS, naming: GROUPED };

    it('WHEN lines are built THEN each folder line precedes its projects, which sit at depth 1', () => {
      const lines = taskGridLinesOf(grouped, CLOSED);

      expect(textsOf(lines)).toStrictEqual([
        '(root)',
        'Workspace root (//) (1)',
        'root-lib (1)',
        'apps',
        'web (2)',
        'packages',
        '-tools (1)',
        'core (1)',
        'ui (2)'
      ]);
      expect(lines.map((line) => line.depth)).toStrictEqual([0, 1, 1, 0, 1, 0, 1, 1, 1]);
    });

    it('WHEN the packages folder is toggled THEN its projects are gone and it reads closed', () => {
      const lines = taskGridLinesOf(grouped, openWith(folderKeyOf('packages')));

      expect(textsOf(lines)).toStrictEqual(['(root)', 'Workspace root (//) (1)', 'root-lib (1)', 'apps', 'web (2)', 'packages']);
      expect(groupOf(lines, 'packages').isOpen).toBe(false);
    });

    it('WHEN web is open THEN its task lines sit at depth 2', () => {
      const lines = taskGridLinesOf(grouped, openWith(projectKeyOf('web')));

      expect(taskLineOf(lines, 'web#dev').depth).toBe(2);
    });
  });

  describe('GIVEN chosen ids', () => {
    const table: [string[], GroupState, GroupState][] = [
      [['ui#build'], 'mixed', 'mixed'],
      [['ui#build', 'ui#test'], 'checked', 'mixed'],
      [[], 'unchecked', 'unchecked'],
      [['core#build', '-tools#build', 'ui#build', 'ui#test'], 'checked', 'checked']
    ];

    it.each(table)('WHEN chosen is %j THEN ui reads %s and the packages folder %s', (ids, project, folder) => {
      const facts: TaskGridFacts = { ...FACTS, naming: GROUPED, chosen: new Set(ids) };

      const lines = taskGridLinesOf(facts, CLOSED);

      expect(groupOf(lines, 'ui (2)').state).toBe(project);
      expect(groupOf(lines, 'packages').state).toBe(folder);
    });

    it('WHEN shown differs from chosen THEN a task line checks from chosen and draws from shown', () => {
      const lines = taskGridLinesOf(FACTS, openWith(projectKeyOf('ui')));

      expect(taskLineOf(lines, 'ui#build')).toMatchObject({ isChecked: true, isDrawn: true });
      expect(taskLineOf(lines, 'ui#test')).toMatchObject({ isChecked: false, isDrawn: false });
    });

    it('WHEN an id outside the pool is chosen THEN no project turns mixed because of it', () => {
      const chosen = new Set(['web#build', 'web#dev', 'web#dev-hidden']);

      const lines = taskGridLinesOf({ ...FACTS, chosen }, CLOSED);

      expect(groupOf(lines, 'web (2)').state).toBe('checked');
    });
  });

  describe('GIVEN a single-package root labelled single-app', () => {
    const tasks = [taskOf('//', 'build'), taskOf('//', 'lint'), taskOf('//', 'test')];
    const naming: TaskNaming = { ...FLAT, labels: new Map() };
    const facts: TaskGridFacts = { ...FACTS, tasks, rootLabel: 'single-app', naming };

    it('WHEN lines are built THEN one project line is open with its three task lines', () => {
      const lines = taskGridLinesOf(facts, CLOSED);

      expect(textsOf(lines)).toStrictEqual(['single-app (3)', '//#build', '//#lint', '//#test']);
      expect(groupOf(lines, 'single-app (3)').isOpen).toBe(true);
    });

    it('WHEN the project is toggled THEN it closes', () => {
      const lines = taskGridLinesOf(facts, openWith(projectKeyOf('//')));

      expect(textsOf(lines)).toStrictEqual(['single-app (3)']);
    });
  });

  describe('GIVEN a search and ui toggled open', () => {
    const open: TaskGridOpen = { toggled: new Set([projectKeyOf('ui')]), search: 'test' };

    it('WHEN lines are built THEN only the projects with a matching task are listed, under only matching task lines', () => {
      const facts: TaskGridFacts = { ...FACTS, naming: GROUPED };

      const lines = taskGridLinesOf(facts, open);

      expect(textsOf(lines)).toStrictEqual(['packages', 'ui (2)', 'ui#test']);
    });

    it('WHEN the folder is read THEN its ids and state cover every pool task of core, -tools and ui, listed or not', () => {
      const facts: TaskGridFacts = { ...FACTS, naming: GROUPED };

      const lines = taskGridLinesOf(facts, open);

      expect(groupOf(lines, 'packages').ids).toStrictEqual(['-tools#build', 'core#build', 'ui#build', 'ui#test']);
      expect(groupOf(lines, 'packages').state).toBe('mixed');
    });

    it('WHEN the search matches an owner text THEN the root project is listed through it', () => {
      const lines = taskGridLinesOf(FACTS, { toggled: new Set(), search: 'workspace' });

      expect(textsOf(lines)).toStrictEqual(['Workspace root (//) (1)']);
    });
  });
});
