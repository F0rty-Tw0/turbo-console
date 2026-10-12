import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { failedMessage, invalidOutputMessage, ioMessage, versionUnsupportedMessage } from './turbo-message.util.ts';
import { packageGraphSchema } from '../../turbo/common/package-graph.schema.ts';
import { SUPPORTED_TURBO_RANGE } from '../../turbo/common/turbo-version.const.ts';

const numberedLines = (count: number): string[] => Array.from({ length: count }, (_, index) => `line ${index + 1}`);

const parseError = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (error) {
    return error;
  }
};

describe('FEATURE: turbo error messages', () => {
  describe('GIVEN failedMessage', () => {
    it('WHEN turbo exited 3 THEN it names the exit code, then the stderr tail', () => {
      expect(failedMessage('query', 3, 'bad\n')).toBe('turbo query exited 3\nbad');
    });

    it('WHEN turbo timed out THEN it says so, then the stderr tail', () => {
      expect(failedMessage('query', 'timeout', 'slow\n')).toBe('turbo query timed out\nslow');
    });

    it('WHEN turbo was aborted THEN it says so, then the stderr tail', () => {
      expect(failedMessage('query', 'aborted', 'stopped\n')).toBe('turbo query was aborted\nstopped');
    });

    it('WHEN stderr has 25 lines THEN the message holds the head and lines 6 to 25', () => {
      const lines = numberedLines(25);
      const lastTwenty = lines.slice(5);
      const expected = `turbo query exited 1\n${lastTwenty.join('\n')}`;

      const message = failedMessage('query', 1, `${lines.join('\n')}\n`);

      expect(message).toBe(expected);
    });

    it('WHEN stderr is empty THEN the message has no trailing newline', () => {
      expect(failedMessage('query', 3, '')).toBe('turbo query exited 3');
    });

    it('WHEN the command holds controls and runs past 200 characters THEN the message holds its first 200, made plain', () => {
      const command = `run\n\u001B[2J${'c'.repeat(300)}`;

      expect(failedMessage(command, 3, '')).toBe(`turbo run${'c'.repeat(192)} exited 3`);
    });
  });

  describe('GIVEN invalidOutputMessage', () => {
    it('WHEN JSON.parse failed THEN it says the output is not JSON', () => {
      const error = parseError('x');

      expect(invalidOutputMessage('query', error)).toBe('turbo query printed non-JSON output');
    });

    it('WHEN reading the output failed otherwise THEN it says the output could not be read', () => {
      expect(invalidOutputMessage('query', new Error('read failed'))).toBe('turbo query output could not be read');
    });

    it('WHEN an issue path holds repo text THEN each segment is plain and at most 200 characters', () => {
      const longKey = 'k'.repeat(300);
      const output = { 'evil\n\u001B[2Jkey': 'x', [longKey]: 'y' };
      const expected = `turbo query output failed its schema at evilkey, ${'k'.repeat(200)}`;

      const result = z.record(z.string(), z.number()).safeParse(output);

      expect(invalidOutputMessage('query', result.error)).toBe(expected);
    });

    it('WHEN a key runs past 200 characters THEN the cap counts its raw characters, before they are made plain', () => {
      const output = { [`${'\u0007'.repeat(10)}${'k'.repeat(300)}`]: 'x' };

      const result = z.record(z.string(), z.number()).safeParse(output);

      expect(invalidOutputMessage('query', result.error)).toBe(`turbo query output failed its schema at ${'k'.repeat(190)}`);
    });

    it('WHEN the package graph schema failed THEN it names the issue path, not the input', () => {
      const result = packageGraphSchema.safeParse({ data: {} });

      const message = invalidOutputMessage('query', result.error);

      expect(message).toBe('turbo query output failed its schema at data.packageGraph');
    });

    it('WHEN the root value failed THEN it names the path (root)', () => {
      const result = z.string().safeParse(1);

      expect(invalidOutputMessage('query', result.error)).toBe('turbo query output failed its schema at (root)');
    });

    it('WHEN more than 10 issues exist THEN it names the first 10', () => {
      const result = z.array(z.string()).safeParse(numberedLines(12).map((_, index) => index));

      const message = invalidOutputMessage('query', result.error);

      expect(message).toBe('turbo query output failed its schema at 0, 1, 2, 3, 4, 5, 6, 7, 8, 9');
    });
  });

  describe('GIVEN ioMessage and versionUnsupportedMessage', () => {
    it('WHEN a path and a code are given THEN ioMessage joins them', () => {
      expect(ioMessage('/p', 'EACCES')).toBe('/p: EACCES');
    });

    it('WHEN the code is undefined THEN ioMessage uses EIO', () => {
      expect(ioMessage('/p', undefined)).toBe('/p: EIO');
    });

    it('WHEN the path holds a newline and escape sequences THEN ioMessage prints it as one plain line', () => {
      const path = '/repo/\u001B]0;title\u0007evil\n\u001B[2Jname/turbo.json';

      expect(ioMessage(path, 'EACCES')).toBe('/repo/evilname/turbo.json: EACCES');
    });

    it('WHEN the path runs past 1024 characters THEN ioMessage keeps its last 1024', () => {
      const end = `${'d'.repeat(1024 - '/turbo.json'.length)}/turbo.json`;

      expect(ioMessage(`/${'d'.repeat(2000)}/turbo.json`, 'EIO')).toBe(`${end}: EIO`);
    });

    it('WHEN the code holds a newline and an escape sequence THEN ioMessage prints it plain', () => {
      expect(ioMessage('/p', 'EACCES\n\u001B[2J')).toBe('/p: EACCES');
    });

    it('WHEN an unsupported version is given THEN the message names it and the supported range', () => {
      const { min, maxExclusive } = SUPPORTED_TURBO_RANGE;

      const message = versionUnsupportedMessage('2.12.0', SUPPORTED_TURBO_RANGE);

      expect(message).toBe(`turbo 2.12.0 is not supported; need >=${min} <${maxExclusive}`);
    });
  });
});
