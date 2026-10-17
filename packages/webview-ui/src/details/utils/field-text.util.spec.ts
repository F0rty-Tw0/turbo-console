import { describe, expect, it } from 'vitest';

import { cacheText, definitionText, hiddenScriptsText, listText, noCardsText } from './field-text.util.ts';

const COMMAND = 'vite build';

const HIDDEN_SCRIPTS = { scriptsShown: false, hiddenScriptCount: 3 };

const HIDDEN_NONE = { scriptsShown: false, hiddenScriptCount: 0 };

const SHOWN_WITH_COUNT = { scriptsShown: true, hiddenScriptCount: 3 };

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
      ['HIT', 'cached: will replay'],
      ['MISS', 'not cached: will run'],
      ['deferred', 'unknown: decided at run time']
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
      expect(definitionText(null, 'loading')).toBe('No command (runs its dependencies)');
    });
  });

  describe('GIVEN a task with a command and no definition', () => {
    it('WHEN the dry run is loading THEN it reads "loading…"', () => {
      expect(definitionText(COMMAND, 'loading')).toBe('loading…');
    });

    it('WHEN the dry run failed THEN it reads "—"', () => {
      expect(definitionText(COMMAND, 'failed')).toBe('—');
    });

    it('WHEN the dry run is ready THEN it reads "—"', () => {
      expect(definitionText(COMMAND, 'ready')).toBe('—');
    });
  });

  describe('GIVEN a hidden-scripts count', () => {
    it('WHEN the hint is read THEN it names the count in the spec words', () => {
      expect(hiddenScriptsText(3)).toBe('No turbo tasks in this package. Show scripts to see 3.');
    });
  });

  describe('GIVEN a package with no card', () => {
    it('WHEN scripts are hidden and some are offered THEN it reads the hidden-scripts hint with their count', () => {
      expect(noCardsText(HIDDEN_SCRIPTS)).toBe('No turbo tasks in this package. Show scripts to see 3.');
    });

    it('WHEN scripts are hidden and none is offered THEN it says the package has no tasks', () => {
      expect(noCardsText(HIDDEN_NONE)).toBe('No tasks in this package.');
    });

    it('WHEN scripts are shown THEN it says the package has no tasks, whatever the count', () => {
      expect(noCardsText(SHOWN_WITH_COUNT)).toBe('No tasks in this package.');
    });
  });
});
