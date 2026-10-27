import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTaskControls, buildTaskRow } from './task-controls-elements.ts';
import { SEARCH_TASKS_LABEL, TASK_CONTROLS_ID } from '../common/graph-task.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { GRAPH_TASK_STUB, ROOT_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';

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
      const row = buildTaskRow(GRAPH_TASK_STUB, null);
      const [name, description] = row.pick.children;

      expect(name?.textContent).toBe('build');
      expect(description?.textContent).toBe('a');
      expect(row.task).toBe(GRAPH_TASK_STUB);
    });

    it('WHEN built THEN its button is out of the Tab order, so the list is one Tab stop', () => {
      const row = buildTaskRow(GRAPH_TASK_STUB, null);

      expect(row.pick.tabIndex).toBe(-1);
      expect(row.line.getAttribute('role')).toBe('row');
    });
  });

  describe('GIVEN buildTaskRow of //#build', () => {
    it('WHEN the root label is single-app THEN its description reads single-app and its title stays //#build', () => {
      const row = buildTaskRow(ROOT_BUILD_STUB, 'single-app');
      const [, description] = row.pick.children;

      expect(description?.textContent).toBe('single-app');
      expect(row.pick.title).toBe('//#build');
    });

    it('WHEN there is no root label THEN its description reads //', () => {
      const row = buildTaskRow(ROOT_BUILD_STUB, null);
      const [, description] = row.pick.children;

      expect(description?.textContent).toBe('//');
    });
  });
});
