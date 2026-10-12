import { describe, expect, it } from 'vitest';

import { turboBinaryCandidates } from './turbo-platform.util.ts';

describe('FEATURE: native turbo binary candidates', () => {
  describe('GIVEN a platform turbo ships a binary for', () => {
    it('WHEN linux on x64 is listed THEN the scoped package comes first and arch x64 maps to 64', () => {
      const candidates = turboBinaryCandidates('linux', 'x64');

      expect(candidates).toStrictEqual(['@turbo/linux-64/bin/turbo', 'turbo-linux-64/bin/turbo']);
    });

    it('WHEN win32 on x64 is listed THEN the os is windows and the binary ends in .exe', () => {
      const candidates = turboBinaryCandidates('win32', 'x64');

      expect(candidates).toStrictEqual(['@turbo/windows-64/bin/turbo.exe', 'turbo-windows-64/bin/turbo.exe']);
    });

    it('WHEN android on arm64 is listed THEN the linux binary is used', () => {
      const candidates = turboBinaryCandidates('android', 'arm64');

      expect(candidates).toStrictEqual(['@turbo/linux-arm64/bin/turbo', 'turbo-linux-arm64/bin/turbo']);
    });

    it('WHEN darwin on arm64 is listed THEN both darwin-arm64 paths are returned', () => {
      const candidates = turboBinaryCandidates('darwin', 'arm64');

      expect(candidates).toStrictEqual(['@turbo/darwin-arm64/bin/turbo', 'turbo-darwin-arm64/bin/turbo']);
    });
  });

  describe('GIVEN a platform turbo ships no binary for', () => {
    it('WHEN freebsd on x64 is listed THEN there is no candidate', () => {
      const candidates = turboBinaryCandidates('freebsd', 'x64');

      expect(candidates).toStrictEqual([]);
    });

    it('WHEN linux on ia32 is listed THEN there is no candidate', () => {
      const candidates = turboBinaryCandidates('linux', 'ia32');

      expect(candidates).toStrictEqual([]);
    });

    it('WHEN an Object.prototype key is listed as the platform THEN there is no candidate', () => {
      const candidates = turboBinaryCandidates('constructor', 'x64');

      expect(candidates).toStrictEqual([]);
    });
  });
});
