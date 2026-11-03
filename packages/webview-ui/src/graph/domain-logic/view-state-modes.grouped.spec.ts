import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ViewStateModes } from './view-state-modes.ts';
import type { GraphViewState, PanelWidths } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';

const WIDTHS: PanelWidths = { controls: 320, details: 300 };

const FRESH: GraphViewState = freshViewStateOf('h1');

const TASK_SAVED: GraphViewState = {
  ...FRESH,
  mode: 'tasks',
  grouped: true,
  fitted: false,
  controlsOpen: false,
  panelWidths: WIDTHS
};

const PACKAGE_SAVED: GraphViewState = { ...TASK_SAVED, mode: 'packages' };

describe('FEATURE: ViewStateModes saveGrouped', () => {
  let saver: Mocked<ViewStateSaver>;

  beforeEach((): void => {
    saver = { schedule: vi.fn<ViewStateSaver['schedule']>(), flush: vi.fn<ViewStateSaver['flush']>() };
  });

  it('GIVEN task mode saved grouped true WHEN saveGrouped(false) THEN one write with grouped false, fitted true and every other field kept', () => {
    const modes = new ViewStateModes(saver, TASK_SAVED);

    modes.saveGrouped(false);

    expect(saver.schedule).toHaveBeenCalledExactlyOnceWith({ ...TASK_SAVED, grouped: false, fitted: true });
    expect(modes.current()?.grouped).toBe(false);
  });

  it('GIVEN a camera saved unfitted and grouped true WHEN saveGrouped(false) THEN fitted is true', () => {
    const modes = new ViewStateModes(saver, PACKAGE_SAVED);

    modes.saveGrouped(false);

    expect(modes.current()?.fitted).toBe(true);
  });

  it('GIVEN a camera saved unfitted and grouped true WHEN saveGrouped(true) with the same value THEN fitted stays false', () => {
    const modes = new ViewStateModes(saver, PACKAGE_SAVED);

    modes.saveGrouped(true);

    expect(modes.current()?.fitted).toBe(false);
  });

  it('GIVEN package mode saved WHEN saveGrouped(true) THEN it writes in package mode', () => {
    const modes = new ViewStateModes(saver, PACKAGE_SAVED);

    modes.saveGrouped(true);

    expect(modes.mode()).toBe('packages');
  });

  it('GIVEN nothing saved WHEN saveGrouped(true) THEN nothing is written and current() stays null', () => {
    const modes = new ViewStateModes(saver, null);

    modes.saveGrouped(true);

    expect([saver.schedule.mock.calls.length, modes.current()]).toStrictEqual([0, null]);
  });

  it('GIVEN a state read without a grouping choice WHEN saveGrouped(true) THEN isGroupingSaved() is true', () => {
    const modes = new ViewStateModes(saver, TASK_SAVED, false);

    modes.saveGrouped(true);

    expect(modes.isGroupingSaved()).toBe(true);
  });

  it('GIVEN dragged panel widths WHEN saveGrouped THEN the written state carries them', () => {
    const modes = new ViewStateModes(saver, TASK_SAVED);

    modes.saveGrouped(false);

    expect(modes.current()?.panelWidths).toStrictEqual(WIDTHS);
  });
});
