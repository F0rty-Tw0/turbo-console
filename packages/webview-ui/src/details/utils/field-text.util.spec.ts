import { describe, expect, it } from 'vitest';

import { cacheText, definitionText, listText } from './field-text.util.ts';
import type { TaskCard } from '../../bridge/common/details-state.type.ts';
import { TASK_CARD_STUB } from '../test/stubs/details.stub.ts';

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

  describe('GIVEN a card with a definition', () => {
    it('WHEN its definition text is read THEN there is none', () => {
      expect(definitionText(TASK_CARD_STUB, 'ready')).toBeNull();
    });
  });

  describe('GIVEN a card with no command', () => {
    it('WHEN its definition text is read during a dry run THEN it says the task runs its dependencies', () => {
      const card: TaskCard = { ...TASK_CARD_STUB, command: null, definition: null, cacheStatus: null };

      const text = definitionText(card, 'loading');

      expect(text).toBe('No command (runs its dependencies)');
    });
  });

  describe('GIVEN a card with a command and no definition', () => {
    const card: TaskCard = { ...TASK_CARD_STUB, definition: null, cacheStatus: null };

    it('WHEN the dry run is loading THEN it reads "loading…"', () => {
      expect(definitionText(card, 'loading')).toBe('loading…');
    });

    it('WHEN the dry run failed THEN it reads "—"', () => {
      expect(definitionText(card, 'failed')).toBe('—');
    });

    it('WHEN the dry run is ready THEN it reads "—"', () => {
      expect(definitionText(card, 'ready')).toBe('—');
    });
  });
});
