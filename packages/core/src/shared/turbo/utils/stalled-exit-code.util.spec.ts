import { describe, expect, it } from 'vitest';

import { isJsonEnd, isVersionEnd, jsonExitCode, queryExitCode, versionExitCode } from './stalled-exit-code.util.ts';

const QUERY_DATA = '{\n  "version": "2.11.7",\n  "data": {\n    "packageGraph": {}\n  }\n}\n';

/** What turbo 2.11.7 prints, and exits 2 with, for `{ package(name: "nope-pkg") { name } }`. */
const QUERY_ERRORS =
  '{\n  "version": "2.11.7",\n  "data": null,\n  "errors": [\n    { "message": "Package not found: nope-pkg" }\n  ]\n}\n';

describe('FEATURE: exit codes read from a stalled turbo output', () => {
  describe('GIVEN a stdout tail checked with isJsonEnd', () => {
    it('WHEN it ends with a closing brace and a newline THEN it is an end', () => {
      expect(isJsonEnd('"a": 1\n}\n')).toBe(true);
    });

    it('WHEN it stops inside the object THEN it is not an end', () => {
      expect(isJsonEnd('{"tasks":[')).toBe(false);
    });

    it('WHEN it is empty THEN it is not an end', () => {
      expect(isJsonEnd('')).toBe(false);
    });
  });

  describe('GIVEN a dry-run stdout read with jsonExitCode', () => {
    it('WHEN it is complete JSON THEN the exit code is 0', () => {
      expect(jsonExitCode('{"tasks":[]}\n')).toBe(0);
    });

    it('WHEN it is cut off THEN there is no exit code', () => {
      expect(jsonExitCode('{"tasks":[')).toBeNull();
    });
  });

  describe('GIVEN a query stdout read with queryExitCode', () => {
    it('WHEN it is complete JSON with data THEN the exit code is 0', () => {
      expect(queryExitCode(QUERY_DATA)).toBe(0);
    });

    it('WHEN it is complete JSON with errors THEN the exit code is 2, as turbo exits', () => {
      expect(queryExitCode(QUERY_ERRORS)).toBe(2);
    });

    it('WHEN its errors list is empty THEN the exit code is 0', () => {
      expect(queryExitCode('{"data":{},"errors":[]}')).toBe(0);
    });

    it('WHEN it is JSON but not an object THEN the exit code is 0', () => {
      expect(queryExitCode('null')).toBe(0);
    });

    it('WHEN it is cut off THEN there is no exit code', () => {
      expect(queryExitCode(QUERY_DATA.slice(0, -4))).toBeNull();
    });
  });

  describe('GIVEN a --version stdout', () => {
    it('WHEN it is one version line THEN the exit code is 0 and it is an end', () => {
      expect([versionExitCode('2.11.7\n'), isVersionEnd('2.11.7\n')]).toStrictEqual([0, true]);
    });

    it('WHEN the line ends with CRLF THEN the exit code is 0', () => {
      expect(versionExitCode('2.11.7\r\n')).toBe(0);
    });

    it('WHEN the newline has not come yet THEN there is no exit code and it is not an end', () => {
      expect([versionExitCode('2.11.7'), isVersionEnd('2.11.7')]).toStrictEqual([null, false]);
    });

    it('WHEN it is empty THEN there is no exit code', () => {
      expect(versionExitCode('')).toBeNull();
    });
  });
});
