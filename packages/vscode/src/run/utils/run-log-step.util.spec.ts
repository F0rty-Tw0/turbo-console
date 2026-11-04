import { describe, expect, it } from 'vitest';

import { RUN_LOG_READ_MAX, RUN_LOG_START } from '../common/run-log-tail.const.ts';
import type { RunLogCursor } from '../common/run-log-tail.type.ts';
import { BROKEN_OBJECT, ENTRY_A, ENTRY_B, ENTRY_C, INVALID_OBJECT } from '../test/common/run-log-step.const.ts';
import type { RunLogProbe, RunLogProbeRow, RunLogSummary } from '../test/common/run-log-step.type.ts';
import { RUN_LOG_SUMMARY_STUB } from '../test/stubs/run-log-step.stub.ts';
import { byteLengthOf, bytesOf, openObjectOf, turboLogOf, turboLogTextOf } from '../test/utils/run-log-bytes.spec.util.ts';
import { fileSummaryOf, probeOf, stepSummaryOf } from '../test/utils/run-log-step.spec.util.ts';

describe("FEATURE: one read of turbo's log file (spec D4, D5)", () => {
  describe('GIVEN the empty array turbo creates ([\\n]\\n)', () => {
    it('WHEN read THEN no entry and the cursor stays at 0', () => {
      const bytes = turboLogOf([]);

      const summary = stepSummaryOf(bytes);

      expect(summary).toStrictEqual(RUN_LOG_SUMMARY_STUB);
    });
  });

  describe('GIVEN a file holding A and B, closed by ]', () => {
    const closedAt = byteLengthOf(`[\n${ENTRY_A}\n,\n${ENTRY_B}`);

    it("WHEN read THEN both entries, and the cursor sits right after B's }", () => {
      const bytes = turboLogOf([ENTRY_A, ENTRY_B]);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, sources: ['a#build', 'b#build'], offset: closedAt };

      const summary = stepSummaryOf(bytes);

      expect(summary).toStrictEqual(expected);
    });

    it('WHEN read again from that cursor after turbo appended C over the ] THEN only C', () => {
      const cursor: RunLogCursor = { ...RUN_LOG_START, offset: closedAt, hasEntry: true };
      const tail = turboLogOf([ENTRY_A, ENTRY_B, ENTRY_C]).subarray(closedAt);
      const appendedAt = closedAt + byteLengthOf(`\n,\n${ENTRY_C}`);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, sources: ['c#build'], offset: appendedAt };

      const summary = stepSummaryOf(tail, cursor);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe('GIVEN A and an open object still being written', () => {
    it("WHEN read THEN A, and the cursor sits on the open object's {", () => {
      const bytes = bytesOf(`[\n${ENTRY_A}\n,\n{"source":"b#bu`);
      const openAt = byteLengthOf(`[\n${ENTRY_A}\n,\n`);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, sources: ['a#build'], offset: openAt };

      const summary = stepSummaryOf(bytes);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe("GIVEN turbo's first write one byte in ([\\n{\\n, torn over [\\n]\\n)", () => {
    it('WHEN read THEN nothing counted and the cursor sits at 2', () => {
      const bytes = bytesOf('[\n{\n');
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, offset: 2 };

      const summary = stepSummaryOf(bytes);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe('GIVEN a skip that ends mid-window with a { right after the newline that runs past the full window', () => {
    it('WHEN read THEN nothing counted and the cursor sits on that {', () => {
      const cursor: RunLogCursor = { ...RUN_LOG_START, offset: 100, skipping: true };
      const bytes = bytesOf(`garbage\n${openObjectOf(RUN_LOG_READ_MAX - 8)}`);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, offset: 108 };

      const summary = stepSummaryOf(bytes, cursor, true);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe("GIVEN a broken object (unterminated string), then turbo's \\n,\\n and A", () => {
    it('WHEN read THEN A, one invalid counted, the cursor past A', () => {
      const bytes = turboLogOf([BROKEN_OBJECT, ENTRY_A]);
      const closedAt = byteLengthOf(`[\n${BROKEN_OBJECT}\n,\n${ENTRY_A}`);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, sources: ['a#build'], offset: closedAt, leadingInvalid: 1 };

      const summary = stepSummaryOf(bytes);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe('GIVEN a full window of broken lines ({\\n repeated)', () => {
    it('WHEN read THEN the cursor sits on the last {, and the file is unknown', () => {
      const bytes = bytesOf('{\n'.repeat(RUN_LOG_READ_MAX / 2));
      const expected: RunLogSummary = {
        ...RUN_LOG_SUMMARY_STUB,
        offset: RUN_LOG_READ_MAX - 2,
        leadingInvalid: RUN_LOG_READ_MAX / 2 - 1,
        isUnknown: true
      };

      const summary = stepSummaryOf(bytes, RUN_LOG_START, true);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe('GIVEN a full window that is one open object (2 MiB line, no newline yet)', () => {
    const lineCursor: RunLogCursor = { offset: RUN_LOG_READ_MAX, skipping: true, leadingInvalid: 1, hasEntry: false };

    it('WHEN read THEN no entry, the cursor moves past the window and is skipping', () => {
      const bytes = bytesOf(openObjectOf(RUN_LOG_READ_MAX));
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, offset: RUN_LOG_READ_MAX, skipping: true, leadingInvalid: 1 };

      const summary = stepSummaryOf(bytes, RUN_LOG_START, true);

      expect(summary).toStrictEqual(expected);
    });

    it('WHEN the next window holds the rest of that line, a newline and A THEN A, skipping ends', () => {
      const text = `xxx"}\n${ENTRY_A}`;
      const bytes = bytesOf(text);
      const passedAt = RUN_LOG_READ_MAX + bytes.length;
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, sources: ['a#build'], offset: passedAt, leadingInvalid: 1 };

      const summary = stepSummaryOf(bytes, lineCursor);

      expect(summary).toStrictEqual(expected);
    });

    it('WHEN the next window holds no newline either THEN the cursor moves past it, still skipping', () => {
      const bytes = bytesOf('x'.repeat(100));
      const passedAt = RUN_LOG_READ_MAX + 100;
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, offset: passedAt, skipping: true, leadingInvalid: 1 };

      const summary = stepSummaryOf(bytes, lineCursor);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe('GIVEN a full window that is one open object ended by a newline, then ,\\n (the next { lies past the window)', () => {
    it('WHEN read THEN one invalid counted, and the cursor moves past the newline, not skipping', () => {
      const bytes = bytesOf(`${openObjectOf(RUN_LOG_READ_MAX - 3)}\n,\n`);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, offset: RUN_LOG_READ_MAX - 2, leadingInvalid: 1 };

      const summary = stepSummaryOf(bytes, RUN_LOG_START, true);

      expect(summary).toStrictEqual(expected);
    });

    it('WHEN the tail reads the whole file, A before that line and B after it THEN A and B', () => {
      const open = openObjectOf(RUN_LOG_READ_MAX - 3);
      const file = turboLogOf([ENTRY_A, open, ENTRY_B]);
      const closedAt = byteLengthOf(`[\n${ENTRY_A}\n,\n${open}\n,\n${ENTRY_B}`);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, sources: ['a#build', 'b#build'], offset: closedAt };

      const summary = fileSummaryOf(file);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe('GIVEN a full window of separators with no {', () => {
    it('WHEN read THEN the cursor moves past the window, nothing counted', () => {
      const bytes = bytesOf(',\n'.repeat(RUN_LOG_READ_MAX / 2));
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, offset: RUN_LOG_READ_MAX };

      const summary = stepSummaryOf(bytes, RUN_LOG_START, true);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe('GIVEN a full window that starts with A and ends inside an open object', () => {
    it("WHEN read THEN A, and the cursor sits on that object's { (progress, not broken)", () => {
      const bytes = bytesOf(`${ENTRY_A}${openObjectOf(RUN_LOG_READ_MAX - ENTRY_A.length)}`);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, sources: ['a#build'], offset: ENTRY_A.length };

      const summary = stepSummaryOf(bytes, RUN_LOG_START, true);

      expect(summary).toStrictEqual(expected);
    });
  });

  describe('GIVEN the D4 probe (RUN_LOG_PROBE = 3)', () => {
    const rows: RunLogProbeRow[] = [
      {
        name: 'three invalid objects first',
        windows: [INVALID_OBJECT.repeat(3)],
        leadingInvalid: 3,
        isUnknown: true
      },
      {
        name: 'two invalid objects, then A',
        windows: [`${INVALID_OBJECT.repeat(2)}${ENTRY_A}`],
        leadingInvalid: 2,
        isUnknown: false
      },
      {
        name: 'two invalid objects in one read and one in the next',
        windows: [INVALID_OBJECT.repeat(2), INVALID_OBJECT],
        leadingInvalid: 3,
        isUnknown: true
      },
      {
        name: 'A, then three invalid objects',
        windows: [ENTRY_A, INVALID_OBJECT.repeat(3)],
        leadingInvalid: 0,
        isUnknown: false
      },
      {
        name: 'two invalid objects and one broken line',
        windows: [`${INVALID_OBJECT.repeat(2)}${BROKEN_OBJECT}\n,\n${ENTRY_A}`],
        leadingInvalid: 3,
        isUnknown: true
      },
      {
        name: 'A, then three broken lines',
        windows: [turboLogTextOf([ENTRY_A, BROKEN_OBJECT, BROKEN_OBJECT, BROKEN_OBJECT, ENTRY_C])],
        leadingInvalid: 0,
        isUnknown: false
      },
      {
        name: 'A in one read, then an oversize line filling the next',
        windows: [ENTRY_A, openObjectOf(RUN_LOG_READ_MAX)],
        leadingInvalid: 0,
        isUnknown: false
      }
    ];

    it.each(rows)('WHEN the file holds $name THEN leadingInvalid is $leadingInvalid and unknown is $isUnknown', (row) => {
      const expected: RunLogProbe = { leadingInvalid: row.leadingInvalid, isUnknown: row.isUnknown };

      const probe = probeOf(row.windows);

      expect(probe).toStrictEqual(expected);
    });

    it('WHEN a read proves the file unknown THEN it returns no entry, even a valid one after the invalid ones', () => {
      const bytes = bytesOf(`${INVALID_OBJECT.repeat(3)}${ENTRY_A}`);
      const expected: RunLogSummary = { ...RUN_LOG_SUMMARY_STUB, offset: bytes.length, leadingInvalid: 3, isUnknown: true };

      const summary = stepSummaryOf(bytes);

      expect(summary).toStrictEqual(expected);
    });
  });
});
