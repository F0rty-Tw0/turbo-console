import { describe, expect, it } from 'vitest';

import { cacheText, definitionText, listText } from './field-text.util.ts';

const COMMAND = 'vite build';

const COMMAND_TASK = { command: COMMAND, isTurboTask: true };

const NO_COMMAND_TASK = { command: null, isTurboTask: true };

const NOT_TURBO_TASK = { command: COMMAND, isTurboTask: false };

const NOT_TURBO_NO_COMMAND_TASK = { command: null, isTurboTask: false };

describe('FEATURE: field texts', () => {
  describe('GIVEN an empty list', () => {
    it('WHEN it is the inputs field THEN it reads as turbo default inputs', () => {
      expect(listText([], 'inputs')).toBe('default (all files in the package)');
    });

    it('WHEN it is any other field THEN it reads "none"', () => {
      expect(listText([], 'other')).toBe('none');
    });
  });

  describe('GIVEN a list with values', () => {
    it('WHEN it is rendered THEN the values join with a comma', () => {
      expect(listText(['a', 'b'], 'other')).toBe('a, b');
    });

    it('WHEN it is the inputs field THEN the values join with a comma', () => {
      expect(listText(['src/**'], 'inputs')).toBe('src/**');
    });
  });

  describe('GIVEN a known cache status', () => {
    it.each([
      ['HIT', 'hit'],
      ['MISS', 'miss'],
      ['deferred', 'decided at run time']
    ] as const)('WHEN the status is %s THEN it reads "%s"', (status, text) => {
      expect(cacheText(status, 'ready')).toBe(text);
    });
  });

  describe('GIVEN no cache status', () => {
    it('WHEN the dry run is loading THEN it reads "loading…"', () => {
      expect(cacheText(null, 'loading')).toBe('loading…');
    });

    it('WHEN the dry run failed THEN it reads "—"', () => {
      expect(cacheText(null, 'failed')).toBe('—');
    });

    it('WHEN the dry run is ready THEN it reads "—"', () => {
      expect(cacheText(null, 'ready')).toBe('—');
    });
  });

  describe('GIVEN a task with no command and no definition', () => {
    it('WHEN its definition text is read during a dry run THEN it says the task runs its dependencies', () => {
      expect(definitionText(NO_COMMAND_TASK, 'loading')).toBe('No command (runs its dependencies)');
    });
  });

  describe('GIVEN a task with a command and no definition', () => {
    it('WHEN the dry run is loading THEN it reads "loading…"', () => {
      expect(definitionText(COMMAND_TASK, 'loading')).toBe('loading…');
    });

    it('WHEN the dry run failed THEN it reads "—"', () => {
      expect(definitionText(COMMAND_TASK, 'failed')).toBe('—');
    });

    it('WHEN the dry run is ready THEN it reads "—"', () => {
      expect(definitionText(COMMAND_TASK, 'ready')).toBe('—');
    });
  });

  describe('GIVEN a task no turbo config defines', () => {
    it('WHEN the dry run is loading THEN it says it is not a turbo task', () => {
      expect(definitionText(NOT_TURBO_TASK, 'loading')).toBe('Not a turbo task: no turbo.json defines it');
    });

    it('WHEN the dry run is ready THEN it says it is not a turbo task', () => {
      expect(definitionText(NOT_TURBO_TASK, 'ready')).toBe('Not a turbo task: no turbo.json defines it');
    });

    it('WHEN it also has no command THEN it says it is not a turbo task, not that it has no command', () => {
      expect(definitionText(NOT_TURBO_NO_COMMAND_TASK, 'ready')).toBe('Not a turbo task: no turbo.json defines it');
    });
  });
});
