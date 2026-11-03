import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTaskControls, buildTaskRow } from './task-controls-elements.ts';
import { ROOT_TASKS_TITLE, SEARCH_TASKS_LABEL, SHOW_SCRIPTS_LABEL, TASK_CONTROLS_ID } from '../common/graph-task.const.ts';
import { GROUP_BY_FOLDER_LABEL, SCOPE_TOGGLE_LABEL, SEARCH_SECTION_TITLE, VIEW_SECTION_TITLE } from '../common/graph.const.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { GRAPH_TASK_STUB, ROOT_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';

const isHtmlElement = (element: Element | undefined): element is HTMLElement => element !== undefined && 'title' in element;

const childAt = (parent: Element, index: number): HTMLElement => {
  const child = parent.children[index];

  if (!isHtmlElement(child)) throw new Error(`no element child ${index}`);

  return child;
};

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

    it('WHEN built THEN the panel holds the Search section, the View section and the list, in that order', () => {
      const { panel, list, search } = buildTaskControls();
      const [searchSection, viewSection, last] = [childAt(panel, 0), childAt(panel, 1), childAt(panel, 2)];

      expect(panel.children).toHaveLength(3);
      expect([searchSection.tagName, searchSection.children[0]?.textContent]).toStrictEqual(['SECTION', SEARCH_SECTION_TITLE]);
      expect([viewSection.tagName, viewSection.children[0]?.textContent]).toStrictEqual(['SECTION', VIEW_SECTION_TITLE]);
      expect(childAt(searchSection, 1).children).toContain(search);
      expect(last).toBe(list);
    });

    it('WHEN built THEN the View section lists the depth field, then Group by folder, Show package scopes and Show scripts', () => {
      const { panel, depth } = buildTaskControls();
      const [, depthGroup, ...checks] = childAt(panel, 1).children;
      const depthLabel = childAt(childAt(panel, 1), 1).children[0];

      expect(depthLabel?.children[1]).toBe(depth);
      expect(checks.map((check) => check.textContent)).toStrictEqual([GROUP_BY_FOLDER_LABEL, SCOPE_TOGGLE_LABEL, SHOW_SCRIPTS_LABEL]);
      expect(depthGroup?.children).toHaveLength(2);
    });

    it('WHEN built THEN Group by folder, Show package scopes and Show scripts are unticked checkboxes inside their labels', () => {
      const { grouping, scope, scripts, groupingField, scriptsField } = buildTaskControls();

      const boxes = [grouping, scope, scripts];

      expect(boxes.map((box) => box.type)).toStrictEqual(['checkbox', 'checkbox', 'checkbox']);
      expect(boxes.filter((box) => box.checked)).toStrictEqual([]);
      expect([groupingField.children[0], scriptsField.children[0]]).toStrictEqual([grouping, scripts]);
    });

    it('WHEN built THEN Show scripts starts hidden and Group by folder does not', () => {
      const { groupingField, scriptsField } = buildTaskControls();

      expect([groupingField.hidden, scriptsField.hidden]).toStrictEqual([false, true]);
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

    it('WHEN there is no root label THEN its description reads the root title', () => {
      const row = buildTaskRow(ROOT_BUILD_STUB, null);
      const [, description] = row.pick.children;

      expect(description?.textContent).toBe(ROOT_TASKS_TITLE);
    });
  });
});
