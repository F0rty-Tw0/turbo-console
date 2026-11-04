import { bytesOf } from './run-log-bytes.spec.util.ts';
import { RUN_LOG_READ_MAX, RUN_LOG_START } from '../../common/run-log-tail.const.ts';
import type { RunLogCursor, RunLogStep } from '../../common/run-log-tail.type.ts';
import { runLogStepOf } from '../../utils/run-log-step.util.ts';
import type { RunLogProbe, RunLogSummary } from '../common/run-log-step.type.ts';

const FIRST_STEP: RunLogStep = { cursor: RUN_LOG_START, entries: [], isUnknown: false };

const summaryOf = (step: RunLogStep, sources: string[]): RunLogSummary => {
  const summary: RunLogSummary = {
    sources,
    offset: step.cursor.offset,
    skipping: step.cursor.skipping,
    leadingInvalid: step.cursor.leadingInvalid,
    isUnknown: step.isUnknown
  };

  return summary;
};

/** One step of `bytes` read from `cursor`. */
export const stepSummaryOf = (bytes: Uint8Array, cursor: RunLogCursor = RUN_LOG_START, isFull = false): RunLogSummary => {
  const step = runLogStepOf(cursor, bytes, isFull);
  const sources = step.entries.map((entry) => entry.source);

  return summaryOf(step, sources);
};

const nextStepOf = (previous: RunLogStep, window: string): RunLogStep => {
  const bytes = bytesOf(window);
  const isFull = bytes.length === RUN_LOG_READ_MAX;

  return runLogStepOf(previous.cursor, bytes, isFull);
};

/** The D4 probe after stepping each window in turn from the start; a window of `RUN_LOG_READ_MAX` bytes is full. */
export const probeOf = (windows: string[]): RunLogProbe => {
  const last = windows.reduce(nextStepOf, FIRST_STEP);
  const probe: RunLogProbe = { leadingInvalid: last.cursor.leadingInvalid, isUnknown: last.isUnknown };

  return probe;
};

/** Reads `file` as the tail does: a window of `RUN_LOG_READ_MAX` bytes from each cursor, until one is not full. */
export const fileSummaryOf = (file: Uint8Array): RunLogSummary => {
  const sources: string[] = [];
  let step = FIRST_STEP;
  let isFull = true;

  while (isFull) {
    const end = step.cursor.offset + RUN_LOG_READ_MAX;
    const bytes = file.subarray(step.cursor.offset, end);

    isFull = bytes.length === RUN_LOG_READ_MAX;
    step = runLogStepOf(step.cursor, bytes, isFull);

    for (const entry of step.entries) sources.push(entry.source);
  }

  return summaryOf(step, sources);
};
