import { describe, expect, it } from 'vitest';

import { toastText } from './link-safe.util.ts';

const MAX = 200;

describe('FEATURE: toast text', () => {
  describe('GIVEN text with markdown link syntax', () => {
    it('WHEN it is made toast text THEN the link target no longer follows its label', () => {
      expect(toastText('[x](command:workbench.action.showCommands)', MAX)).toBe('[x] (command:workbench.action.showCommands)');
    });

    it('WHEN the target opens twice THEN no label and target stay joined', () => {
      expect(toastText('a]((b](c)', MAX)).not.toContain('](');
    });

    it.each([String.fromCodePoint(0x200b), String.fromCodePoint(0x202e), '\u0007', '\u001b[31m'])(
      'WHEN a hidden character (%j) sits between the label and the target THEN no label and target stay joined',
      (hidden) => {
        expect(toastText(`[x]${hidden}(command:a)`, MAX)).not.toContain('](');
      }
    );
  });

  it.each(['plain', '[label] alone', '(parens)'])(
    'GIVEN text with no label and target pair (%j) WHEN it is made toast text THEN it is unchanged',
    (text) => {
      expect(toastText(text, MAX)).toBe(text);
    }
  );
});
