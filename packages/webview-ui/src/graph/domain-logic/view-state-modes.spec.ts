import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ViewStateModes } from './view-state-modes.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState, PackageViewState, PanelWidths, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';

const PAN: Position = { x: 4, y: -2 };

const ORIGIN: Position = { x: 0, y: 0 };

const PACKAGE_STATE: PackageViewState = {
  hash: 'h1',
  zoom: 1.5,
  pan: PAN,
  fitted: false,
  selected: 'web',
  controlsOpen: true,
  search: 'we',
  depth: 1,
  hidden: [],
  focus: null,
  tags: [],
  detailsOpen: true,
  link: null,
  trace: null,
  folder: null,
  grouped: false,
  collapsed: []
};

const TASK: TaskViewState = {
  chosen: ['web#build'],
  capLifted: false,
  depth: 1,
  selected: null,
  search: '',
  zoom: 1,
  pan: ORIGIN,
  fitted: false,
  layoutKey: 'k1'
};

const NEXT_TASK: TaskViewState = { ...TASK, chosen: ['web#build', 'ui#test'], layoutKey: 'k2' };

const FRESH_H2: GraphViewState = freshViewStateOf('h2');

const WIDTHS: PanelWidths = { controls: 320, details: 300 };

const PACKAGE_SAVED: GraphViewState = { ...PACKAGE_STATE, mode: 'packages', task: TASK, panelWidths: null };

const TASK_SAVED: GraphViewState = { ...PACKAGE_STATE, mode: 'tasks', task: TASK, panelWidths: null };

describe('FEATURE: ViewStateModes', () => {
  let saver: Mocked<ViewStateSaver>;

  beforeEach((): void => {
    saver = { schedule: vi.fn<ViewStateSaver['schedule']>(), flush: vi.fn<ViewStateSaver['flush']>() };
  });

  describe('GIVEN nothing saved', () => {
    it('WHEN read THEN mode is packages, task is null and there is no current state', () => {
      const modes = new ViewStateModes(saver, null);

      expect([modes.mode(), modes.task(), modes.current()]).toStrictEqual(['packages', null, null]);
    });

    it('WHEN a task is saved THEN the write is the fresh state of the hash in task mode', () => {
      const modes = new ViewStateModes(saver, null);

      modes.saveTask(TASK, 'h2');

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...FRESH_H2, mode: 'tasks', task: TASK });
    });

    it('WHEN the mode is set THEN the write is the fresh state of the hash in that mode', () => {
      const modes = new ViewStateModes(saver, null);

      modes.setMode('tasks', 'h2');

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...FRESH_H2, mode: 'tasks' });
    });

    it('WHEN the panels are saved THEN nothing is written', () => {
      const modes = new ViewStateModes(saver, null);

      modes.savePanels({ controlsOpen: false });

      expect(saver.schedule).not.toHaveBeenCalled();
    });

    it('WHEN a package save arrives THEN it is written in package mode with no task', () => {
      const modes = new ViewStateModes(saver, null);

      modes.packages.schedule(PACKAGE_STATE);

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...PACKAGE_STATE, mode: 'packages', task: null, panelWidths: null });
    });
  });

  describe('GIVEN the grouping choice the host kept', () => {
    it.each([
      ['nothing saved', false, null, undefined],
      ['a saved state', true, PACKAGE_SAVED, undefined],
      ['a state saved before folders existed', false, PACKAGE_SAVED, false]
    ])('WHEN modes start from %s THEN a grouping choice is saved: %s', (_name, expected, saved, hasGrouping) => {
      const modes = new ViewStateModes(saver, saved, hasGrouping);

      expect(modes.isGroupingSaved()).toBe(expected);
    });

    it('WHEN a state saved before folders existed is followed by a package save THEN a grouping choice is saved', () => {
      const modes = new ViewStateModes(saver, PACKAGE_SAVED, false);

      modes.packages.schedule(PACKAGE_STATE);

      expect(modes.isGroupingSaved()).toBe(true);
    });
  });

  describe('GIVEN a saved task in package mode', () => {
    it('WHEN read THEN mode is packages and the task is the saved one', () => {
      const modes = new ViewStateModes(saver, PACKAGE_SAVED);

      expect([modes.mode(), modes.task()]).toStrictEqual(['packages', TASK]);
    });

    it('WHEN a package save arrives THEN the write keeps mode and task', () => {
      const modes = new ViewStateModes(saver, PACKAGE_SAVED);

      modes.packages.schedule({ ...PACKAGE_STATE, zoom: 2 });

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...PACKAGE_STATE, zoom: 2, mode: 'packages', task: TASK, panelWidths: null });
    });

    it('WHEN a package save for a new hash arrives THEN the task carries across', () => {
      const modes = new ViewStateModes(saver, PACKAGE_SAVED);

      modes.packages.schedule({ ...PACKAGE_STATE, hash: 'h2' });

      expect(saver.schedule).toHaveBeenLastCalledWith({
        ...PACKAGE_STATE,
        hash: 'h2',
        mode: 'packages',
        task: TASK,
        panelWidths: null
      });
    });

    it('WHEN the mode is set to tasks THEN the last state is written in task mode', () => {
      const modes = new ViewStateModes(saver, PACKAGE_SAVED);

      modes.setMode('tasks', 'h1');

      expect(saver.schedule).toHaveBeenLastCalledWith(TASK_SAVED);
    });

    it('WHEN a task is saved THEN the package fields stay and the mode turns to tasks', () => {
      const modes = new ViewStateModes(saver, PACKAGE_SAVED);

      modes.saveTask(NEXT_TASK, 'h1');

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...PACKAGE_STATE, mode: 'tasks', task: NEXT_TASK, panelWidths: null });
    });

    it('WHEN the packages are flushed THEN the saver flushes', () => {
      const modes = new ViewStateModes(saver, PACKAGE_SAVED);

      modes.packages.flush();

      expect(saver.flush).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a saved task in task mode', () => {
    it('WHEN read THEN mode is tasks and current is the saved state', () => {
      const modes = new ViewStateModes(saver, TASK_SAVED);

      expect([modes.mode(), modes.current()]).toStrictEqual(['tasks', TASK_SAVED]);
    });

    it('WHEN a package save with its own zoom and panels closed arrives THEN nothing is written', () => {
      const modes = new ViewStateModes(saver, TASK_SAVED);

      modes.packages.schedule({ ...PACKAGE_STATE, zoom: 9, controlsOpen: false, detailsOpen: false });

      expect(saver.schedule).not.toHaveBeenCalled();
      expect(modes.current()).toStrictEqual(TASK_SAVED);
    });

    it('WHEN task mode closes its Details THEN the write takes detailsOpen and keeps the task', () => {
      const modes = new ViewStateModes(saver, TASK_SAVED);

      modes.savePanels({ detailsOpen: false });

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...TASK_SAVED, detailsOpen: false });
    });

    it('WHEN task mode closes Controls and a stale package save follows THEN a task save keeps controlsOpen false', () => {
      const modes = new ViewStateModes(saver, TASK_SAVED);

      modes.savePanels({ controlsOpen: false });
      modes.packages.schedule(PACKAGE_STATE);
      modes.saveTask(NEXT_TASK, 'h1');

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...TASK_SAVED, controlsOpen: false, task: NEXT_TASK });
    });

    it('WHEN the mode is set to packages THEN the last state is written in package mode with its task', () => {
      const modes = new ViewStateModes(saver, TASK_SAVED);

      modes.setMode('packages', 'h1');

      expect(saver.schedule).toHaveBeenLastCalledWith(PACKAGE_SAVED);
    });

    it('WHEN a task is saved THEN mode reads tasks and task reads the new task', () => {
      const modes = new ViewStateModes(saver, TASK_SAVED);

      modes.saveTask(NEXT_TASK, 'h1');

      expect([modes.mode(), modes.task()]).toStrictEqual(['tasks', NEXT_TASK]);
    });
  });

  describe('GIVEN saved panel widths', () => {
    it('WHEN built THEN panelWidths() returns them', () => {
      const modes = new ViewStateModes(saver, { ...FRESH_H2, panelWidths: WIDTHS });

      expect(modes.panelWidths()).toStrictEqual(WIDTHS);
    });

    it('WHEN a package save runs THEN the written state carries them', () => {
      const modes = new ViewStateModes(saver, { ...FRESH_H2, panelWidths: WIDTHS });

      modes.packages.schedule(PACKAGE_STATE);

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...PACKAGE_STATE, mode: 'packages', task: null, panelWidths: WIDTHS });
    });

    it('WHEN the next package save is for another hash THEN it still carries them', () => {
      const modes = new ViewStateModes(saver, { ...FRESH_H2, panelWidths: WIDTHS });

      modes.packages.schedule({ ...PACKAGE_STATE, hash: 'h9' });

      expect(saver.schedule).toHaveBeenLastCalledWith(expect.objectContaining({ hash: 'h9', panelWidths: WIDTHS }));
    });
  });

  describe('GIVEN a saved state', () => {
    it('WHEN savePanelWidths runs THEN it writes the state with them', () => {
      const modes = new ViewStateModes(saver, FRESH_H2);

      modes.savePanelWidths(WIDTHS);

      expect(saver.schedule).toHaveBeenLastCalledWith({ ...FRESH_H2, panelWidths: WIDTHS });
    });
  });

  describe('GIVEN nothing saved and widths dragged', () => {
    it('WHEN savePanelWidths runs THEN nothing is written yet', () => {
      const modes = new ViewStateModes(saver, null);

      modes.savePanelWidths(WIDTHS);

      expect(saver.schedule).not.toHaveBeenCalled();
    });

    it('WHEN the next write runs THEN it carries them', () => {
      const modes = new ViewStateModes(saver, null);

      modes.savePanelWidths(WIDTHS);
      modes.setMode('tasks', 'h1');

      expect(modes.current()?.panelWidths).toStrictEqual(WIDTHS);
    });
  });
});
