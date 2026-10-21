import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createViewStateSaver } from './view-state-saver.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';

const PAN: Position = { x: 0, y: 0 };

const FIRST: GraphViewState = {
  hash: 'h',
  zoom: 1,
  pan: PAN,
  selected: null,
  controlsOpen: true,
  search: '',
  depth: 1,
  hidden: [],
  focus: null,
  tags: [],
  detailsOpen: true,
  link: null,
  trace: null
};

const SECOND: GraphViewState = { ...FIRST, zoom: 2 };

const DELAY_MS = 250;

describe('FEATURE: createViewStateSaver', () => {
  let save: Mock<(state: GraphViewState) => void>;
  let saver: ViewStateSaver;

  beforeEach((): void => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    save = vi.fn<(state: GraphViewState) => void>();
    saver = createViewStateSaver(save, DELAY_MS);
  });

  afterEach((): void => {
    vi.useRealTimers();
  });

  describe('GIVEN two schedules inside the delay', () => {
    beforeEach((): void => {
      saver.schedule(FIRST);
      vi.advanceTimersByTime(100);
      saver.schedule(SECOND);
    });

    it('WHEN the delay passes after the second THEN one save holds the second state', () => {
      vi.advanceTimersByTime(DELAY_MS);

      expect(save.mock.calls).toStrictEqual([[SECOND]]);
    });

    it('WHEN the delay has not passed after the second THEN nothing is saved', () => {
      vi.advanceTimersByTime(DELAY_MS - 1);

      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a pending state', () => {
    beforeEach((): void => {
      saver.schedule(FIRST);
    });

    it('WHEN it is flushed THEN it is saved at once', () => {
      saver.flush();

      expect(save.mock.calls).toStrictEqual([[FIRST]]);
    });

    it('WHEN it is flushed and the delay passes THEN the timer saves nothing more', () => {
      saver.flush();
      vi.advanceTimersByTime(DELAY_MS);

      expect(save).toHaveBeenCalledTimes(1);
    });

    it('WHEN a schedule follows the flush THEN a new debounce saves it after the delay', () => {
      saver.flush();
      saver.schedule(SECOND);
      vi.advanceTimersByTime(DELAY_MS);

      expect(save.mock.calls).toStrictEqual([[FIRST], [SECOND]]);
    });
  });

  it('GIVEN nothing pending WHEN it is flushed THEN nothing is saved', () => {
    saver.flush();

    expect(save).not.toHaveBeenCalled();
  });
});
