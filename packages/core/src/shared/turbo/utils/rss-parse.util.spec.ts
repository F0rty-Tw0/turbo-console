import { describe, expect, it } from 'vitest';

import { parseProcStatus, parsePsRss, parseTasklistCsv } from './rss-parse.util.ts';

const tasklistRow = (memUsage: string): string => `\r\n"turbo.exe","42","Console","1","${memUsage}"\r\n`;

const LOCALIZED_MEM_USAGES: string[] = ['123,456 K', '123.456 K', '123 456 K', '123 456 K', '123 456 K', '123�456 K', '123 456 Ko'];

describe('FEATURE: RSS parsers', () => {
  describe('GIVEN /proc/<pid>/status text', () => {
    it('WHEN it has a VmRSS line THEN the value is in bytes', () => {
      const bytes = parseProcStatus('Name:\tturbo\nVmRSS:\t  12345 kB\nThreads:\t4\n');

      expect(bytes).toBe(12345 * 1024);
    });

    it('WHEN it has no VmRSS line THEN it is null', () => {
      const bytes = parseProcStatus('Name:\tturbo\nThreads:\t4\n');

      expect(bytes).toBeNull();
    });
  });

  describe('GIVEN ps rss output', () => {
    it('WHEN it is padded digits THEN the value is in bytes', () => {
      const bytes = parsePsRss('  4567\n');

      expect(bytes).toBe(4567 * 1024);
    });

    it('WHEN it is empty THEN it is null', () => {
      const bytes = parsePsRss('');

      expect(bytes).toBeNull();
    });

    it('WHEN it is not digits THEN it is null', () => {
      const bytes = parsePsRss('ps: error\n');

      expect(bytes).toBeNull();
    });
  });

  describe('GIVEN tasklist CSV output', () => {
    it.each(LOCALIZED_MEM_USAGES)('WHEN the memory is %j THEN the value is in bytes', (memUsage) => {
      const bytes = parseTasklistCsv(tasklistRow(memUsage), 42);

      expect(bytes).toBe(123456 * 1024);
    });

    it('WHEN it is the no-tasks info line THEN it is null', () => {
      const bytes = parseTasklistCsv('INFO: No tasks are running which match the specified criteria.', 42);

      expect(bytes).toBeNull();
    });

    it('WHEN the row is for another pid THEN it is null', () => {
      const bytes = parseTasklistCsv(tasklistRow('123,456 K'), 43);

      expect(bytes).toBeNull();
    });

    it('WHEN the row has 4 fields THEN it is null', () => {
      const bytes = parseTasklistCsv('"turbo.exe","42","Console","1"', 42);

      expect(bytes).toBeNull();
    });

    it('WHEN the memory is N/A THEN it is null', () => {
      const bytes = parseTasklistCsv(tasklistRow('N/A'), 42);

      expect(bytes).toBeNull();
    });

    it('WHEN a non-matching line precedes the row THEN the row is used', () => {
      const stdout = `INFO: noise\r\n${tasklistRow('7 K')}`;

      const bytes = parseTasklistCsv(stdout, 42);

      expect(bytes).toBe(7 * 1024);
    });
  });
});
