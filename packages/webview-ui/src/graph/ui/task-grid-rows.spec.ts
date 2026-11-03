import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildProjectLine } from './task-grid-rows.ts';
import type { GroupState } from '../common/graph-controls.type.ts';
import type { GroupLine, TaskLine } from '../common/task-grid.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';
import { childAt } from '../test/utils/html-child.spec.util.ts';

const PROJECT: GroupLine = {
  kind: 'project',
  key: 'project:web',
  depth: 0,
  text: 'web (2)',
  label: 'Choose tasks of web',
  ids: ['web#build', 'web#dev'],
  state: 'unchecked',
  isOpen: false
};

const FOLDER: GroupLine = {
  ...PROJECT,
  kind: 'folder',
  key: 'folder:apps',
  text: 'apps',
  label: 'Choose tasks of folder apps',
  isOpen: true
};

const TASK: TaskLine = {
  kind: 'task',
  key: 'task:a#build',
  depth: 1,
  task: GRAPH_TASK_STUB,
  label: 'Choose a#build',
  isChecked: true,
  isDrawn: true
};

describe('FEATURE: buildProjectLine', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a collapsed project line', () => {
    it('WHEN built THEN it is a row of kind project and depth 0 holding two gridcells', () => {
      const { element } = buildProjectLine(PROJECT);
      const cells = [childAt(element, 0), childAt(element, 1)];

      expect(element.getAttribute('role')).toBe('row');
      expect(element.dataset).toMatchObject({ kind: 'project', depth: '0' });
      expect(cells.map((cell) => cell.getAttribute('role'))).toStrictEqual(['gridcell', 'gridcell']);
    });

    it('WHEN built THEN the cells hold the check, then the name button', () => {
      const { element, check, name } = buildProjectLine(PROJECT);

      expect(childAt(childAt(element, 0), 0)).toBe(check);
      expect(childAt(childAt(element, 1), 0)).toBe(name);
    });

    it('WHEN built THEN the check is named by the line label and out of the Tab order', () => {
      const { check } = buildProjectLine(PROJECT);

      expect(check.getAttribute('aria-label')).toBe('Choose tasks of web');
      expect(check.tabIndex).toBe(-1);
    });

    it('WHEN built THEN the name button reads the text, is out of the Tab order and is collapsed with a right chevron first', () => {
      const { name } = buildProjectLine(PROJECT);

      expect(name).toMatchObject({ title: 'web (2)', tabIndex: -1 });
      expect(name.getAttribute('aria-expanded')).toBe('false');
      expect(childAt(name, 0).className).toContain('codicon-chevron-right');
    });
  });

  describe('GIVEN an open folder line', () => {
    it('WHEN built THEN its name is expanded with a down chevron', () => {
      const { name, element } = buildProjectLine(FOLDER);

      expect(name.getAttribute('aria-expanded')).toBe('true');
      expect(childAt(name, 0).className).toContain('codicon-chevron-down');
      expect(element.dataset['kind']).toBe('folder');
    });
  });

  describe('GIVEN a group state', () => {
    const table: [GroupState, boolean, boolean][] = [
      ['checked', true, false],
      ['unchecked', false, false],
      ['mixed', false, true]
    ];

    it.each(table)('WHEN the state is %s THEN checked is %s and indeterminate is %s', (state, checked, indeterminate) => {
      const { check } = buildProjectLine({ ...PROJECT, state });

      expect(check.checked).toBe(checked);
      expect(check.indeterminate).toBe(indeterminate);
    });
  });

  describe('GIVEN a drawn task line', () => {
    it('WHEN built THEN the name reads the task name with the id as title, and nothing is dimmed or expandable', () => {
      const { name, element, check } = buildProjectLine(TASK);

      expect(name).toMatchObject({ title: 'a#build', tabIndex: -1 });
      expect(name.getAttribute('aria-expanded')).toBeNull();
      expect(name.getAttribute('aria-disabled')).toBeNull();
      expect(element.className).not.toContain('is-dimmed');
      expect(element.dataset['depth']).toBe('1');
      expect(check.checked).toBe(true);
    });
  });

  describe('GIVEN an undrawn task line', () => {
    it('WHEN built THEN the name is aria-disabled and the row is dimmed', () => {
      const { name, element } = buildProjectLine({ ...TASK, isDrawn: false, isChecked: false });

      expect(name.getAttribute('aria-disabled')).toBe('true');
      expect(element.className).toContain('is-dimmed');
    });
  });
});
