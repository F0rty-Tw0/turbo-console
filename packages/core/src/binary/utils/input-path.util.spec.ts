import * as nodePath from 'node:path';

import { describe, expect, it } from 'vitest';

import { absoluteOverridePath, assertNoNulByte } from './input-path.util.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';

const { posix, win32 } = nodePath;

const messageOf = (check: () => unknown): string => {
  try {
    check();
  } catch (error) {
    return error instanceof Error ? error.message : '';
  }

  return '';
};

describe('FEATURE: caller path checks', () => {
  describe('GIVEN a POSIX override path', () => {
    it('WHEN it is relative THEN it throws invalid-argument naming the path', () => {
      const check = (): string => absoluteOverridePath('node_modules/.bin/turbo', posix);

      expect(check).toThrow(TurboException);
      expect(check).toThrow(expect.objectContaining({ kind: 'invalid-argument', message: 'turbo overridePath must be absolute: node_modules/.bin/turbo' }));
    });

    it('WHEN it is absolute with a parent step THEN it is returned normalized', () => {
      expect(absoluteOverridePath('/opt/tools/../turbo', posix)).toBe('/opt/turbo');
    });

    it('WHEN it holds a control character THEN the message does not carry it raw', () => {
      const message = messageOf(() => absoluteOverridePath('turbo\u001B[2J', posix));

      expect(message).toBe('turbo overridePath must be absolute: turbo');
    });

    it('WHEN it runs past 1024 characters THEN the message keeps only its end', () => {
      const message = messageOf(() => absoluteOverridePath(`${'d'.repeat(2000)}/turbo`, posix));

      expect(message).toBe(`turbo overridePath must be absolute: ${'d'.repeat(1018)}/turbo`);
    });
  });

  describe('GIVEN a Windows override path', () => {
    it.each(['C:\\tools\\turbo.exe', '\\\\server\\share\\turbo.exe'])('WHEN it is %s THEN it is accepted', (path) => {
      expect(absoluteOverridePath(path, win32)).toBe(path);
    });

    it.each(['\\tools\\turbo.exe', '/tools/turbo.exe', 'C:tools\\turbo.exe'])('WHEN it is %s, with no drive THEN it throws invalid-argument', (path) => {
      const check = (): string => absoluteOverridePath(path, win32);

      expect(check).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });
  });

  describe('GIVEN assertNoNulByte', () => {
    it('WHEN the value holds a NUL byte THEN it throws invalid-argument naming the value without it', () => {
      const check = (): void => {
        assertNoNulByte('/repo\0x', 'turbo root');
      };

      expect(check).toThrow(TurboException);
      expect(check).toThrow(expect.objectContaining({ kind: 'invalid-argument', message: 'turbo root must not hold a NUL byte: /repox' }));
    });

    it('WHEN the value has no NUL byte THEN it does not throw', () => {
      const check = (): void => {
        assertNoNulByte('/repo', 'turbo root');
      };

      expect(check).not.toThrow();
    });

    it('WHEN an override path holds a NUL byte THEN absoluteOverridePath throws invalid-argument', () => {
      const check = (): string => absoluteOverridePath('/opt/turbo\0', posix);

      expect(check).toThrow(expect.objectContaining({ kind: 'invalid-argument', message: 'turbo overridePath must not hold a NUL byte: /opt/turbo' }));
    });
  });
});
