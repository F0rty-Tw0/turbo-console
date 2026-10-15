import { describe, expect, it } from 'vitest';

import { system32Path } from './system32-path.util.ts';

const SYSTEM32_PATHS: [string, string | undefined, string][] = [
  ['tasklist.exe', undefined, 'C:\\Windows\\System32\\tasklist.exe'],
  ['x.exe', 'D:\\Win', 'D:\\Win\\System32\\x.exe'],
  ['x.exe', 'relative', 'C:\\Windows\\System32\\x.exe']
];

describe('FEATURE: System32 path', () => {
  describe('GIVEN an exe name and a SystemRoot', () => {
    it.each(SYSTEM32_PATHS)('WHEN %s is resolved under root %s THEN it is %s', (exe, systemRoot, expected) => {
      const path = system32Path(exe, systemRoot);

      expect(path).toBe(expected);
    });
  });
});
