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

  describe('GIVEN task mode saved grouped true with dragged panel widths', () => {
    let modes: ViewStateModes;

    beforeEach((): void => {
      modes = new ViewStateModes(saver, TASK_SAVED);
    });

    describe('WHEN saveGrouped(false)', () => {
      beforeEach((): void => {
        modes.saveGrouped(false);
      });

      it('THEN one write holds grouped false, fitted true and every other field kept', () => {
        expect(saver.schedule).toHaveBeenCalledExactlyOnceWith({ ...TASK_SAVED, grouped: false, fitted: true });
      });

      it('THEN current() reads grouped false', () => {
        expect(modes.current()?.grouped).toBe(false);
      });

      it('THEN the written state carries the panel widths', () => {
        expect(modes.current()?.panelWidths).toStrictEqual(WIDTHS);
      });
    });
  });

  describe('GIVEN package mode saved grouped true with an unfitted camera', () => {
    let modes: ViewStateModes;

    beforeEach((): void => {
      modes = new ViewStateModes(saver, PACKAGE_SAVED);
    });

    it('WHEN saveGrouped(false) THEN fitted is true', () => {
      modes.saveGrouped(false);

      expect(modes.current()?.fitted).toBe(true);
    });

    it('WHEN saveGrouped(true) with the same value THEN fitted stays false', () => {
      modes.saveGrouped(true);

      expect(modes.current()?.fitted).toBe(false);
    });

    it('WHEN saveGrouped(true) THEN it writes in package mode', () => {
      modes.saveGrouped(true);

      expect(modes.mode()).toBe('packages');
    });
  });

  describe('GIVEN nothing saved', () => {
    it('WHEN saveGrouped(true) THEN nothing is written and current() stays null', () => {
      const modes = new ViewStateModes(saver, null);

      modes.saveGrouped(true);

      expect([saver.schedule.mock.calls.length, modes.current()]).toStrictEqual([0, null]);
    });
  });

  describe('GIVEN a state read without a grouping choice', () => {
    it('WHEN saveGrouped(true) THEN isGroupingSaved() is true', () => {
      const modes = new ViewStateModes(saver, TASK_SAVED, false);

      modes.saveGrouped(true);

      expect(modes.isGroupingSaved()).toBe(true);
    });
  });
});
