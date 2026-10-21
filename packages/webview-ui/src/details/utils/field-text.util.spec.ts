import { describe, expect, it } from 'vitest';

import {
  cacheValue,
  definitionValue,
  descriptionText,
  hiddenScriptsText,
  listValue,
  noCardsText,
  plainValue
} from './field-text.util.ts';

const COMMAND = 'vite build';

const HIDDEN_SCRIPTS = { scriptsShown: false, hiddenScriptCount: 3 };

const HIDDEN_NONE = { scriptsShown: false, hiddenScriptCount: 0 };

const SHOWN_WITH_COUNT = { scriptsShown: true, hiddenScriptCount: 3 };

describe('FEATURE: field texts', () => {
  describe('GIVEN an empty list value', () => {
    it('WHEN it is the inputs field THEN it is an empty value reading turbo default inputs', () => {
      expect(listValue([], 'inputs')).toStrictEqual({ kind: 'empty', text: 'default (all files in the package)' });
    });

    it('WHEN it is any other field THEN it is an empty value reading "none"', () => {
      expect(listValue([], 'other')).toStrictEqual({ kind: 'empty', text: 'none' });
    });
  });

  describe('GIVEN a list value with entries', () => {
    it('WHEN it is any other field THEN the entries stay separate', () => {
      expect(listValue(['a', 'b'], 'other')).toStrictEqual({ kind: 'list', entries: ['a', 'b'] });
    });

    it('WHEN it is the inputs field THEN the entries stay separate', () => {
      expect(listValue(['src/**'], 'inputs')).toStrictEqual({ kind: 'list', entries: ['src/**'] });
    });
  });

  describe('GIVEN a known cache status value', () => {
    it.each([
      ['HIT', 'cached: will replay'],
      ['MISS', 'not cached: will run'],
      ['deferred', 'unknown: decided at run time']
    ] as const)('WHEN the status is %s THEN it is a plain value reading "%s"', (status, text) => {
      expect(cacheValue(status, 'ready')).toStrictEqual({ kind: 'plain', text, isCode: false });
    });
  });

  describe('GIVEN no cache status value', () => {
    it('WHEN the dry run is loading THEN it is an empty value reading "loading…"', () => {
      expect(cacheValue(null, 'loading')).toStrictEqual({ kind: 'empty', text: 'loading…' });
    });

    it('WHEN the dry run failed THEN it is an empty value reading "—"', () => {
      expect(cacheValue(null, 'failed')).toStrictEqual({ kind: 'empty', text: '—' });
    });

    it('WHEN the dry run is ready THEN it is an empty value reading "—"', () => {
      expect(cacheValue(null, 'ready')).toStrictEqual({ kind: 'empty', text: '—' });
    });
  });

  describe('GIVEN a task with no command and no definition value', () => {
    it.each(['loading', 'ready'] as const)(
      'WHEN the dry run is %s THEN it is a plain value saying the task runs its dependencies',
      (phase) => {
        expect(definitionValue(null, phase)).toStrictEqual({
          kind: 'plain',
          text: 'No command (runs its dependencies)',
          isCode: false
        });
      }
    );
  });

  describe('GIVEN a task with a command and no definition value', () => {
    it('WHEN the dry run is loading THEN it is an empty value reading "loading…"', () => {
      expect(definitionValue(COMMAND, 'loading')).toStrictEqual({ kind: 'empty', text: 'loading…' });
    });

    it('WHEN the dry run failed THEN it is an empty value reading "—"', () => {
      expect(definitionValue(COMMAND, 'failed')).toStrictEqual({ kind: 'empty', text: '—' });
    });

    it('WHEN the dry run is ready THEN it is an empty value reading "—"', () => {
      expect(definitionValue(COMMAND, 'ready')).toStrictEqual({ kind: 'empty', text: '—' });
    });
  });

  describe('GIVEN a plain value', () => {
    it('WHEN the text is null THEN it is an empty value reading "none"', () => {
      expect(plainValue(null, true)).toStrictEqual({ kind: 'empty', text: 'none' });
    });

    it('WHEN the text is a multi-line command THEN it is a plain code value with the text verbatim', () => {
      expect(plainValue('echo a\nb', true)).toStrictEqual({ kind: 'plain', text: 'echo a\nb', isCode: true });
    });
  });

  describe('GIVEN a description', () => {
    it('WHEN it is null THEN there is no text', () => {
      expect(descriptionText(null)).toBeNull();
    });

    it('WHEN it is empty THEN there is no text', () => {
      expect(descriptionText('')).toBeNull();
    });

    it('WHEN it is only whitespace THEN there is no text', () => {
      expect(descriptionText(' \n\t ')).toBeNull();
    });

    it('WHEN it has words THEN the text is the description verbatim', () => {
      expect(descriptionText(' Builds the app ')).toBe(' Builds the app ');
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
