import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTaskDetails, buildTaskDetailsPanel } from './task-details-elements.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { TASK_DETAILS_ID } from '../common/graph-task.const.ts';
import { DETAILS_LABEL } from '../common/graph.const.ts';
import type { TaskDetailsModel } from '../common/task-details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { API_BUILD_STUB, GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';

const TASK_NO_COMMAND: GraphTask = { ...GRAPH_TASK_STUB, command: null, isRunnable: false };

const STOPPED_NO_COMMAND: TaskDetailsModel = { task: TASK_NO_COMMAND, state: 'stopped', dependencies: [] };

const RUNNING: TaskDetailsModel = { task: GRAPH_TASK_STUB, state: 'running', dependencies: [API_BUILD_STUB] };

const NEVER_RUN: TaskDetailsModel = { ...RUNNING, state: null };

describe('FEATURE: task details elements', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GIVEN buildTaskDetailsPanel WHEN built THEN it is the hidden aside #graph-task-details labelled Details', () => {
    const { panel } = buildTaskDetailsPanel();

    expect(panel).toMatchObject({ tagName: 'ASIDE', id: TASK_DETAILS_ID, hidden: true });
    expect(panel.className).toBe('graph-details graph-task-details');
    expect(panel.getAttribute('aria-label')).toBe(DETAILS_LABEL);
  });

  it('GIVEN buildTaskDetailsPanel WHEN built THEN the aside holds only its empty content', () => {
    const { panel, content } = buildTaskDetailsPanel();

    expect(panel.children).toStrictEqual([content]);
    expect(content.className).toBe('details-content');
    expect(content.children).toStrictEqual([]);
  });

  it('GIVEN a task with a null command and isRunnable false THEN No command shows and Run is absent', () => {
    const els = buildTaskDetails(STOPPED_NO_COMMAND);

    expect(els.command.textContent).toBe('No command');
    expect(els.run.hidden).toBe(true);
    expect(els.runNoCache.hidden).toBe(true);
    expect(els.stop.hidden).toBe(true);
  });

  describe('GIVEN a runnable a#build that is running and needs api#build', () => {
    it('WHEN built THEN the heading is its name and the command reads as text', () => {
      const els = buildTaskDetails(RUNNING);

      expect(els.heading.textContent).toBe('build');
      expect(els.command.textContent).toBe('tsc');
    });

    it('WHEN built THEN the state reads Running and is not hidden', () => {
      const els = buildTaskDetails(RUNNING);

      expect(els.state.textContent).toBe('Running');
      expect(els.state.hidden).toBe(false);
      expect(els.state.getAttribute('data-state')).toBe('running');
    });

    it('WHEN built THEN Run, Run without cache and Stop are all shown', () => {
      const els = buildTaskDetails(RUNNING);

      expect(els.run).toMatchObject({ hidden: false, textContent: 'Run' });
      expect(els.runNoCache).toMatchObject({ hidden: false, textContent: 'Run without cache' });
      expect(els.stop).toMatchObject({ hidden: false, textContent: 'Stop' });
    });

    it('WHEN built THEN api#build is a dependency button named by its id', () => {
      const els = buildTaskDetails(RUNNING);
      const [dependency] = els.dependencies;

      expect(els.dependencies).toHaveLength(1);
      expect(dependency?.task).toBe(API_BUILD_STUB);
      expect(dependency?.button.textContent).toBe('api#build');
    });
  });

  it('GIVEN a task that never ran WHEN built THEN the state line is hidden and Stop too', () => {
    const els = buildTaskDetails(NEVER_RUN);

    expect(els.state.hidden).toBe(true);
    expect(els.stop.hidden).toBe(true);
  });
});
