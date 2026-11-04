import { describe, expect, it } from 'vitest';

import { isUnknownRunLog, scanRunLog } from './run-log-scan.util.ts';
import { RUN_LOG_OBJECT_MAX } from '../common/run-log.const.ts';
import type { RunLogEntry } from '../common/run-log.type.ts';
import { runLogFixtureBytes } from '../test/utils/run-log-fixture.spec.util.ts';
import { jsonElementCount, oversizeEntryJson, runLogBytes, runLogEntryOf } from '../test/utils/run-log-source.spec.util.ts';

const E1 = runLogEntryOf(1);
const E2 = runLogEntryOf(2);
const E3 = runLogEntryOf(3);
const E1_JSON = JSON.stringify(E1);
const E2_JSON = JSON.stringify(E2);
const E3_JSON = JSON.stringify(E3);
const THREE_ENTRIES_BYTES = runLogBytes(`[${E1_JSON},${E2_JSON},${E3_JSON}]`);
const TWO_ENTRIES_CLOSED_BYTES = runLogBytes(`[${E1_JSON},${E2_JSON}]`);
const TWO_ENTRIES_OPEN_BYTES = runLogBytes(`[${E1_JSON},${E2_JSON},`);
const THREE_ENTRIES_OPEN_BYTES = runLogBytes(`[${E1_JSON},${E2_JSON},${E3_JSON}`);
const HALF_OF_E2 = E2_JSON.slice(0, E2_JSON.length / 2);

describe('FEATURE: scanning turbo structured log bytes', () => {
  describe('GIVEN a complete array of three entries', () => {
    it('WHEN it is scanned in one call THEN all three entries come back', () => {
      const scan = scanRunLog(THREE_ENTRIES_BYTES, 0);

      expect(scan.entries).toStrictEqual([E1, E2, E3]);
    });

    it('WHEN it is scanned in one call THEN next is after the third object and before the closing ]', () => {
      const scan = scanRunLog(THREE_ENTRIES_BYTES, 0);

      expect(scan.next).toBe(THREE_ENTRIES_BYTES.length - 1);
    });

    it('WHEN the same bytes arrive one byte more per call, each call starting at the last next THEN the entries collected equal the one-call entries', () => {
      const collected: RunLogEntry[] = [];
      let next = 0;

      for (let size = 1; size <= THREE_ENTRIES_BYTES.length; size += 1) {
        const scan = scanRunLog(THREE_ENTRIES_BYTES.subarray(0, size), next);

        collected.push(...scan.entries);
        next = scan.next;
      }

      expect(collected).toStrictEqual([E1, E2, E3]);
    });
  });

  describe('GIVEN an array whose closing ] is rewritten in place', () => {
    it('WHEN the first bytes are scanned and the longer bytes are scanned from that next THEN the second call returns only E3', () => {
      const first = scanRunLog(TWO_ENTRIES_CLOSED_BYTES, 0);

      const second = scanRunLog(THREE_ENTRIES_BYTES, first.next);

      expect(second.entries).toStrictEqual([E3]);
    });
  });

  describe('GIVEN an array only appended to, with no closing ]', () => {
    it('WHEN the first bytes are scanned and the longer bytes are scanned from that next THEN the second call returns only E3', () => {
      const first = scanRunLog(TWO_ENTRIES_OPEN_BYTES, 0);

      const second = scanRunLog(THREE_ENTRIES_OPEN_BYTES, first.next);

      expect(second.entries).toStrictEqual([E3]);
    });
  });

  describe('GIVEN an entry whose text holds string syntax', () => {
    it.each(['a { b', 'a } b', 'say \\"hi\\"', 'one " then }', 'back\\\\slash', '{"nested": 1}'])(
      'WHEN an entry whose text is %s is scanned THEN it is one entry with that exact text',
      (text) => {
        const entry = runLogEntryOf(1, text);
        const bytes = runLogBytes(`[${JSON.stringify(entry)},${E2_JSON}]`);

        const scan = scanRunLog(bytes, 0);

        expect(scan.entries).toStrictEqual([entry, E2]);
      }
    );
  });

  describe('GIVEN an entry whose text is "é✓😀" and a cut inside the 4-byte sequence', () => {
    const entry = runLogEntryOf(1, 'é✓😀');
    const json = `[${JSON.stringify(entry)}]`;
    const bytes = runLogBytes(json);
    const emojiStart = runLogBytes(json.slice(0, json.indexOf('😀'))).length;
    const cut = bytes.subarray(0, emojiStart + 2);

    it('WHEN the bytes up to the cut are scanned THEN no entry comes back and next is the start of that object', () => {
      const scan = scanRunLog(cut, 0);

      expect(scan).toStrictEqual({ entries: [], next: 1, invalid: 0, leadingInvalid: 0 });
    });

    it('WHEN the whole bytes are then scanned from that next THEN the entry comes back with the exact text', () => {
      const scan = scanRunLog(bytes, 1);

      expect(scan.entries).toStrictEqual([entry]);
    });
  });

  describe('GIVEN E1 and half of E2', () => {
    it('WHEN scanned THEN only E1 comes back and next is the index of the open {', () => {
      const bytes = runLogBytes(`[${E1_JSON},${HALF_OF_E2}`);

      const scan = scanRunLog(bytes, 0);

      expect(scan).toStrictEqual({ entries: [E1], next: E1_JSON.length + 2, invalid: 0, leadingInvalid: 0 });
    });
  });

  describe('GIVEN one open object spanning the whole input', () => {
    it('WHEN scanned THEN no entry comes back and next equals from', () => {
      const bytes = runLogBytes(HALF_OF_E2);

      const scan = scanRunLog(bytes, 0);

      expect(scan).toStrictEqual({ entries: [], next: 0, invalid: 0, leadingInvalid: 0 });
    });
  });

  describe('GIVEN an invalid object before E1', () => {
    const invalidObjects = [
      ['malformed JSON', '{bad}'],
      ['missing keys', '{"timestamp":1}'],
      ['a wrong type', '{"timestamp":"x","source":"s","level":"l","text":"t"}'],
      ['over the size limit', oversizeEntryJson()]
    ];

    it.each(invalidObjects)('WHEN the object has %s THEN invalid is 1, E1 comes back and next is after E1', (_label, invalidJson) => {
      const text = `[${invalidJson},${E1_JSON}]`;
      const bytes = runLogBytes(text);

      const scan = scanRunLog(bytes, 0);

      expect(scan).toStrictEqual({ entries: [E1], next: bytes.length - 1, invalid: 1, leadingInvalid: 1 });
    });

    it('WHEN the object is exactly the size limit THEN it is a valid entry', () => {
      const emptySize = runLogBytes(JSON.stringify(runLogEntryOf(1, ''))).length;
      const entry = runLogEntryOf(1, 'x'.repeat(RUN_LOG_OBJECT_MAX - emptySize));
      const bytes = runLogBytes(`[${JSON.stringify(entry)}]`);

      const scan = scanRunLog(bytes, 0);

      expect(scan.entries).toStrictEqual([entry]);
    });
  });

  describe('GIVEN three invalid objects then E1', () => {
    it('WHEN scanned THEN leadingInvalid is 3', () => {
      const bytes = runLogBytes(`[{bad},{bad},{bad},${E1_JSON}]`);

      const scan = scanRunLog(bytes, 0);

      expect(scan.leadingInvalid).toBe(3);
    });
  });

  describe('GIVEN E1, an invalid object, E2', () => {
    it('WHEN scanned THEN leadingInvalid is 0 and invalid is 1', () => {
      const bytes = runLogBytes(`[${E1_JSON},{bad},${E2_JSON}]`);

      const scan = scanRunLog(bytes, 0);

      expect(scan).toMatchObject({ leadingInvalid: 0, invalid: 1 });
    });
  });

  describe('GIVEN a leading invalid count', () => {
    it.each([
      [2, false],
      [3, true],
      [4, true]
    ])('WHEN isUnknownRunLog(%i) THEN it is %s', (leadingInvalid, expected) => {
      const unknown = isUnknownRunLog(leadingInvalid);

      expect(unknown).toBe(expected);
    });
  });

  describe('GIVEN from pointing at the second object', () => {
    it('WHEN scanned THEN the first object is not returned', () => {
      const bytes = runLogBytes(`[${E1_JSON},${E2_JSON}]`);

      const scan = scanRunLog(bytes, E1_JSON.length + 2);

      expect(scan.entries).toStrictEqual([E2]);
    });
  });

  describe('GIVEN the captured turbo 2.11.7 logs', () => {
    it.each(['g1-live', 'g4-hit', 'g5-fail', 'g6-stop'])(
      'WHEN %s is scanned whole THEN entries has one item per element of JSON.parse(file) and invalid is 0',
      async (name) => {
        const bytes = await runLogFixtureBytes(name);
        const scan = scanRunLog(bytes, 0);

        expect(scan.entries).toHaveLength(jsonElementCount(bytes));
        expect(scan.invalid).toBe(0);
      }
    );

    it('WHEN g1-partial is scanned THEN invalid is 0 and every entry equals the same-index entry of g1-live', async () => {
      const partialBytes = await runLogFixtureBytes('g1-partial');
      const liveBytes = await runLogFixtureBytes('g1-live');

      const partial = scanRunLog(partialBytes, 0);
      const live = scanRunLog(liveBytes, 0);

      expect(partial.invalid).toBe(0);
      expect(partial.entries).toStrictEqual(live.entries.slice(0, 9));
    });
  });
});
