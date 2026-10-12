import { describe, expect, it } from 'vitest';

import { stderrTail } from './stderr-tail.util.ts';

const numberedLines = (count: number): string[] => Array.from({ length: count }, (_, index) => `line ${index + 1}`);

describe('FEATURE: stderr tail', () => {
  describe('GIVEN stderrTail', () => {
    it('WHEN stderr is empty THEN it returns an empty string', () => {
      expect(stderrTail('', 20)).toBe('');
    });

    it('WHEN stderr has one CRLF-ended line THEN it returns that line without its newline', () => {
      expect(stderrTail('only\r\n', 20)).toBe('only');
    });

    it('WHEN stderr has exactly 20 lines THEN it returns all of them', () => {
      const lines = numberedLines(20);

      const tail = stderrTail(`${lines.join('\r\n')}\r\n\n`, 20);

      expect(tail).toBe(lines.join('\n'));
    });

    it('WHEN stderr has 21 lines THEN it returns lines 2 to 21', () => {
      const lines = numberedLines(21);
      const expected = lines.slice(1).join('\n');

      const tail = stderrTail(`${lines.join('\n')}\n`, 20);

      expect(tail).toBe(expected);
    });

    it('WHEN stderr is one 64 Ki line THEN the tail keeps only the part of it in the last 8 Ki characters', () => {
      const tail = stderrTail(`${'x'.repeat(64 * 1024)}\n`, 20);

      expect(tail).toBe('x'.repeat(8191));
    });

    it('WHEN a line carries ANSI colour codes THEN it comes out plain', () => {
      expect(stderrTail('\u001B[31merror\u001B[39m: boom\n', 20)).toBe('error: boom');
    });

    it('WHEN a line carries BEL THEN it is removed, while tabs stay', () => {
      expect(stderrTail('a\u0007b\td\n', 20)).toBe('ab\td');
    });

    it('WHEN progress lines are split by a lone CR THEN each becomes its own line', () => {
      expect(stderrTail('progress 50%\rprogress 100%\n', 20)).toBe('progress 50%\nprogress 100%');
    });

    it('WHEN the 8 Ki cut lands mid-line THEN that partial line is dropped', () => {
      const tail = stderrTail(`first\n${'a'.repeat(9000)}\nlast\n`, 20);

      expect(tail).toBe('last');
    });
  });
});
