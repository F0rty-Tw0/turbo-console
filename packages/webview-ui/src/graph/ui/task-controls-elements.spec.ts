import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTaskControls, buildTaskRow } from './task-controls-elements.ts';
import { SEARCH_TASKS_LABEL, TASK_CONTROLS_ID } from '../common/graph-task.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';

describe('FEATURE: task controls elements', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN buildTaskControls', () => {
    it('WHEN built THEN Search tasks, Dependents depth 0-5 = 1 and the rows exist', () => {
      const els = buildTaskControls();

      expect(els.search.getAttribute('aria-label')).toBe(SEARCH_TASKS_LABEL);
      expect(els.depth).toMatchObject({ min: '0', max: '5', value: '1' });
      expect(els.list.getAttribute('role')).toBe('grid');
    });

    it('WHEN built THEN the panel is the hidden aside #graph-task-controls', () => {
      const { panel } = buildTaskControls();

      expect(panel).toMatchObject({ tagName: 'ASIDE', id: TASK_CONTROLS_ID, hidden: true });
    });
  });

  describe('GIVEN buildTaskRow of a#build', () => {
    it('WHEN built THEN its button reads the task name, then the package as a description', () => {
      const row = buildTaskRow(GRAPH_TASK_STUB);
      const [name, description] = row.pick.children;

      expect(name?.textContent).toBe('build');
      expect(description?.textContent).toBe('a');
      expect(row.task).toBe(GRAPH_TASK_STUB);
    });

    it('WHEN built THEN its button is out of the Tab order, so the list is one Tab stop', () => {
      const row = buildTaskRow(GRAPH_TASK_STUB);

      expect(row.pick.tabIndex).toBe(-1);
      expect(row.line.getAttribute('role')).toBe('row');
    });
  });
});
