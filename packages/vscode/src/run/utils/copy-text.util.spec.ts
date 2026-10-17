import { describe, expect, it } from 'vitest';

import { scriptCopiedText } from './copy-text.util.ts';
import { DESCRIPTION_MAX } from '../../shared/common/text.const.ts';

describe('FEATURE: script copied text', () => {
  it('GIVEN a package path WHEN read THEN it says to run the command there, in literal backticks', () => {
    expect(scriptCopiedText('packages/web')).toBe('Copied. Run it in `packages/web`.');
  });

  it.each(['.', ''])('GIVEN the root package (path %j) WHEN read THEN it says to run the command in the repo root', (path) => {
    expect(scriptCopiedText(path)).toBe('Copied. Run it in the repo root.');
  });

  describe('GIVEN a package path from the repo', () => {
    it.each<[string, string, string]>([
      ['a bidi override', 'packages/‮web', 'packages/web'],
      ['a control character', 'packages/\u0007web', 'packages/web'],
      ['a newline', 'packages/\nweb', 'packages/ web']
    ])('WHEN it holds %s THEN the text shows it cleaned', (_name, path, shown) => {
      const text = scriptCopiedText(path);

      expect(text).toBe(`Copied. Run it in \`${shown}\`.`);
    });

    it('WHEN it is longer than a description THEN the text cuts it', () => {
      const text = scriptCopiedText('x'.repeat(DESCRIPTION_MAX * 2));

      expect(text).toBe(`Copied. Run it in \`${'x'.repeat(DESCRIPTION_MAX - 1)}…\`.`);
    });

    it('WHEN it is markdown link syntax THEN the text holds no link, as a toast would render it clickable', () => {
      const text = scriptCopiedText('[x](command:workbench.action.showCommands)');

      expect(text).not.toContain('](');
      expect(text).toBe('Copied. Run it in `[x] (command:workbench.action.showCommands)`.');
    });
  });
});
