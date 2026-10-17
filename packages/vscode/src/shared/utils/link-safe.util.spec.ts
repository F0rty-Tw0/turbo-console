import { describe, expect, it } from 'vitest';

import { linkSafe } from './link-safe.util.ts';

describe('FEATURE: link safe text', () => {
  describe('GIVEN text with markdown link syntax', () => {
    it('WHEN it is made safe THEN the link target no longer follows its label', () => {
      expect(linkSafe('[x](command:workbench.action.showCommands)')).toBe('[x] (command:workbench.action.showCommands)');
    });

    it('WHEN the target opens twice THEN no label and target stay joined', () => {
      expect(linkSafe('a]((b](c)')).not.toContain('](');
    });
  });

  it.each(['plain', '[label] alone', '(parens)', ''])(
    'GIVEN text with no label and target pair (%j) WHEN it is made safe THEN it is unchanged',
    (text) => {
      expect(linkSafe(text)).toBe(text);
    }
  );
});
