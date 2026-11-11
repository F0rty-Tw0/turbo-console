import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyRunMarks } from './graph-run-marks.ts';
import type { GraphAffected } from '../../bridge/common/graph-affected.type.ts';
import type { GraphRunsMessage } from '../../bridge/common/graph-message.type.ts';
import { NO_AFFECTED } from '../common/graph-task.const.ts';
import type { TaskAffectedMarks, TaskCanvas, TaskPredictions } from '../common/task-canvas.type.ts';

type RunMarksCanvas = Pick<TaskCanvas, 'predictions' | 'affected'>;

/** What the wire may carry as `affected`, not what the type allows. */
type WireAffected = { readonly affected: unknown };

const PREDICTIONS: TaskPredictions = { 'a#x': 'cached' };

const TASKS: TaskAffectedMarks = { 'a#x': 'changed' };

const AFFECTED: GraphAffected = { mode: 'task', tasks: TASKS };

const MIXED_TASKS = { 'a#x': 'changed', 'b#x': 'loud' };

const MIXED = { mode: 'package', tasks: MIXED_TASKS };

const runsOf = (affected: unknown): GraphRunsMessage => {
  const base: GraphRunsMessage = { type: 'runs', runs: {}, predictions: PREDICTIONS };
  const extra: WireAffected = { affected };

  return Object.assign<GraphRunsMessage, WireAffected>(base, extra);
};

describe('FEATURE: applyRunMarks', () => {
  let canvas: Mocked<RunMarksCanvas>;

  beforeEach(() => {
    canvas = { predictions: vi.fn<TaskCanvas['predictions']>(), affected: vi.fn<TaskCanvas['affected']>() };
  });

  describe('GIVEN a runs message with predictions and affected', () => {
    it('WHEN it is applied THEN the predictions reach the canvas', () => {
      applyRunMarks(canvas, { type: 'runs', runs: {}, predictions: PREDICTIONS, affected: AFFECTED });

      expect(canvas.predictions).toHaveBeenCalledExactlyOnceWith(PREDICTIONS);
    });

    it('WHEN it is applied THEN the affected tasks reach the canvas', () => {
      applyRunMarks(canvas, { type: 'runs', runs: {}, predictions: PREDICTIONS, affected: AFFECTED });

      expect(canvas.affected).toHaveBeenCalledExactlyOnceWith(TASKS);
    });
  });

  describe('GIVEN affected null', () => {
    it('WHEN it is applied THEN the canvas gets one call with an empty record', () => {
      applyRunMarks(canvas, { type: 'runs', runs: {}, affected: null });

      expect(canvas.affected).toHaveBeenCalledExactlyOnceWith(NO_AFFECTED);
    });

    it('WHEN it is applied THEN the record is the shared NO_AFFECTED, so the canvas skips a repeat', () => {
      applyRunMarks(canvas, { type: 'runs', runs: {}, affected: null });

      expect(canvas.affected.mock.lastCall?.[0]).toBe(NO_AFFECTED);
    });
  });

  describe('GIVEN no affected key', () => {
    it('WHEN it is applied THEN affected is not called', () => {
      applyRunMarks(canvas, { type: 'runs', runs: {} });

      expect(canvas.affected).not.toHaveBeenCalled();
    });

    it('WHEN it is applied THEN the predictions get null, so their marks stay', () => {
      applyRunMarks(canvas, { type: 'runs', runs: {} });

      expect(canvas.predictions).toHaveBeenCalledExactlyOnceWith(null);
    });
  });

  describe.each([
    ['a string', 'x'],
    ['an unknown mode', { mode: 'both', tasks: {} }]
  ])('GIVEN affected as %s', (_label, affected) => {
    it('WHEN it is applied THEN affected is not called', () => {
      applyRunMarks(canvas, runsOf(affected));

      expect(canvas.affected).not.toHaveBeenCalled();
    });

    it('WHEN it is applied THEN the predictions still apply', () => {
      applyRunMarks(canvas, runsOf(affected));

      expect(canvas.predictions).toHaveBeenCalledExactlyOnceWith(PREDICTIONS);
    });
  });

  it('GIVEN an object with an unknown mark word WHEN it is applied THEN the canvas gets the record without that entry', () => {
    applyRunMarks(canvas, runsOf(MIXED));

    expect(canvas.affected).toHaveBeenCalledExactlyOnceWith(TASKS);
  });
});
