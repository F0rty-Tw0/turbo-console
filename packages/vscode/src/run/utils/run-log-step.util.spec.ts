import { describe, expect, it } from 'vitest';

import { runLogStepOf } from './run-log-step.util.ts';
import { RUN_LOG_READ_MAX, RUN_LOG_START } from '../common/run-log-tail.const.ts';
import type { RunLogCursor, RunLogStep } from '../common/run-log-tail.type.ts';
import { bytesOf, entryJsonOf, openObjectOf, turboLogOf } from '../test/utils/run-log-bytes.spec.util.ts';

type Summary = {
  readonly sources: string[];
  readonly offset: number;
  readonly skipping: boolean;
  readonly leadingInvalid: number;
  readonly isUnknown: boolean;
};

type ProbeRow = {
  readonly name: string;
  readonly windows: string[];
  readonly leadingInvalid: number;
  readonly isUnknown: boolean;
};

const A = entryJsonOf('a#build', 'one');
const B = entryJsonOf('b#build', 'two {"q":"}"}');
const C = entryJsonOf('c#build', 'three');
const INVALID = '{"x":1}';
const BROKEN = '{"source":"a#b","text":"unterminated';

const QUIET: Summary = { sources: [], offset: 0, skipping: false, leadingInvalid: 0, isUnknown: false };

const stepOf = (bytes: Uint8Array, cursor: RunLogCursor = RUN_LOG_START, isFull = false): RunLogStep =>
  runLogStepOf(cursor, bytes, isFull);

const lengthOf = (text: string): number => bytesOf(text).length;

const summaryOf = (step: RunLogStep): Summary => {
  const sources = step.entries.map((entry) => entry.source);
  const summary: Summary = {
    sources,
    offset: step.cursor.offset,
    skipping: step.cursor.skipping,
    leadingInvalid: step.cursor.leadingInvalid,
    isUnknown: step.isUnknown
  };

  return summary;
};

const nextStepOf = (previous: RunLogStep, window: string): RunLogStep => stepOf(bytesOf(window), previous.cursor);

const lastStepOf = (windows: string[]): RunLogStep => {
  const start: RunLogStep = { cursor: RUN_LOG_START, entries: [], isUnknown: false };

  return windows.reduce(nextStepOf, start);
};

describe("FEATURE: one read of turbo's log file (spec D4, D5)", () => {
  describe('GIVEN the empty array turbo creates ([\\n]\\n)', () => {
    it('WHEN read THEN no entry and the cursor stays at 0', () => {
      const step = stepOf(turboLogOf([]));

      expect(summaryOf(step)).toStrictEqual(QUIET);
    });
  });

  describe('GIVEN a file holding A and B, closed by ]', () => {
    const closedAt = lengthOf(`[\n${A}\n,\n${B}`);

    it("WHEN read THEN both entries, and the cursor sits right after B's }", () => {
      const step = stepOf(turboLogOf([A, B]));

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, sources: ['a#build', 'b#build'], offset: closedAt });
    });

    it('WHEN read again from that cursor after turbo appended C over the ] THEN only C', () => {
      const cursor: RunLogCursor = { ...RUN_LOG_START, offset: closedAt, hasEntry: true };
      const tail = turboLogOf([A, B, C]).subarray(closedAt);

      const step = stepOf(tail, cursor);

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, sources: ['c#build'], offset: closedAt + lengthOf(`\n,\n${C}`) });
    });
  });

  describe('GIVEN A and an open object still being written', () => {
    it("WHEN read THEN A, and the cursor sits on the open object's {", () => {
      const bytes = bytesOf(`[\n${A}\n,\n{"source":"b#bu`);

      const step = stepOf(bytes);

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, sources: ['a#build'], offset: lengthOf(`[\n${A}\n,\n`) });
    });
  });

  describe("GIVEN turbo's first write one byte in ([\\n{\\n, torn over [\\n]\\n)", () => {
    it('WHEN read THEN nothing counted and the cursor sits at 2', () => {
      const step = stepOf(bytesOf('[\n{\n'));

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, offset: 2 });
    });
  });

  describe('GIVEN a skip that ends mid-window with a { right after the newline that runs past the full window', () => {
    it('WHEN read THEN nothing counted and the cursor sits on that {', () => {
      const cursor: RunLogCursor = { ...RUN_LOG_START, offset: 100, skipping: true };
      const bytes = bytesOf(`garbage\n${openObjectOf(RUN_LOG_READ_MAX - 8)}`);

      const step = stepOf(bytes, cursor, true);

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, offset: 108 });
    });
  });

  describe('GIVEN a broken object (unterminated string) followed by a newline and A', () => {
    it('WHEN read THEN A, one invalid counted, the cursor past A', () => {
      const text = `${BROKEN}\n${A}`;

      const step = stepOf(bytesOf(text));

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, sources: ['a#build'], offset: lengthOf(text), leadingInvalid: 1 });
    });
  });

  describe('GIVEN a full window that is one open object (2 MiB line, no newline yet)', () => {
    const lineCursor: RunLogCursor = { offset: RUN_LOG_READ_MAX, skipping: true, leadingInvalid: 1, hasEntry: false };

    it('WHEN read THEN no entry, the cursor moves past the window and is skipping', () => {
      const bytes = bytesOf(openObjectOf(RUN_LOG_READ_MAX));

      const step = stepOf(bytes, RUN_LOG_START, true);

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, offset: RUN_LOG_READ_MAX, skipping: true, leadingInvalid: 1 });
    });

    it('WHEN the next window holds the rest of that line, a newline and A THEN A, skipping ends', () => {
      const text = `xxx"}\n${A}`;

      const step = stepOf(bytesOf(text), lineCursor);

      expect(summaryOf(step)).toStrictEqual({
        ...QUIET,
        sources: ['a#build'],
        offset: RUN_LOG_READ_MAX + lengthOf(text),
        leadingInvalid: 1
      });
    });

    it('WHEN the next window holds no newline either THEN the cursor moves past it, still skipping', () => {
      const step = stepOf(bytesOf('x'.repeat(100)), lineCursor);

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, offset: RUN_LOG_READ_MAX + 100, skipping: true, leadingInvalid: 1 });
    });
  });

  describe('GIVEN a full window of separators with no {', () => {
    it('WHEN read THEN the cursor moves past the window, nothing counted', () => {
      const bytes = bytesOf(',\n'.repeat(RUN_LOG_READ_MAX / 2));

      const step = stepOf(bytes, RUN_LOG_START, true);

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, offset: RUN_LOG_READ_MAX });
    });
  });

  describe('GIVEN a full window that starts with A and ends inside an open object', () => {
    it("WHEN read THEN A, and the cursor sits on that object's { (progress, not broken)", () => {
      const bytes = bytesOf(`${A}${openObjectOf(RUN_LOG_READ_MAX - A.length)}`);

      const step = stepOf(bytes, RUN_LOG_START, true);

      expect(summaryOf(step)).toStrictEqual({ ...QUIET, sources: ['a#build'], offset: A.length });
    });
  });

  describe('GIVEN the D4 probe (RUN_LOG_PROBE = 3)', () => {
    const rows: ProbeRow[] = [
      { name: 'three invalid objects first', windows: [INVALID.repeat(3)], leadingInvalid: 3, isUnknown: true },
      { name: 'two invalid objects, then A', windows: [`${INVALID.repeat(2)}${A}`], leadingInvalid: 2, isUnknown: false },
      {
        name: 'two invalid objects in one read and one in the next',
        windows: [INVALID.repeat(2), INVALID],
        leadingInvalid: 3,
        isUnknown: true
      },
      { name: 'A, then three invalid objects', windows: [A, INVALID.repeat(3)], leadingInvalid: 0, isUnknown: false },
      {
        name: 'two invalid objects and one broken line',
        windows: [`${INVALID.repeat(2)}${BROKEN}\n${A}`],
        leadingInvalid: 3,
        isUnknown: true
      }
    ];

    it.each(rows)('WHEN the file holds $name THEN leadingInvalid is $leadingInvalid and unknown is $isUnknown', (row) => {
      const step = lastStepOf(row.windows);

      expect(step.cursor.leadingInvalid).toBe(row.leadingInvalid);
      expect(step.isUnknown).toBe(row.isUnknown);
    });

    it('WHEN a read proves the file unknown THEN it returns no entry, even a valid one after the invalid ones', () => {
      const step = stepOf(bytesOf(`${INVALID.repeat(3)}${A}`));

      expect(summaryOf(step)).toStrictEqual({
        ...QUIET,
        offset: lengthOf(`${INVALID.repeat(3)}${A}`),
        leadingInvalid: 3,
        isUnknown: true
      });
    });
  });
});
