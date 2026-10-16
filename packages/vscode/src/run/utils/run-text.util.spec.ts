import { describe, expect, it } from 'vitest';

import { failedToStartText, startTimeoutText, startWaitText, unsafeScriptText } from './run-text.util.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';

describe('FEATURE: run texts', () => {
  describe('GIVEN a process name', () => {
    it.each(['turbo', 'pnpm'])('WHEN the failed to start text is made for %s THEN it names that process', (name) => {
      expect(failedToStartText(name)).toBe(`Couldn't start ${name}.`);
    });

    it.each(['turbo', 'pnpm'])('WHEN the start timeout text is made for %s THEN it names that process', (name) => {
      expect(startTimeoutText(name)).toBe(`${name} process did not start within 10 s`);
    });

    it.each(['turbo', 'pnpm'])('WHEN the start wait text is made for %s THEN it names that process', (name) => {
      const expected = `${name} process has not started after 10 s; VS Code may be waiting on a save prompt or an input`;

      expect(startWaitText(name)).toBe(expected);
    });
  });

  describe('GIVEN a refused script name', () => {
    it('WHEN the unsafe text is made THEN it quotes the name in backticks', () => {
      expect(unsafeScriptText('a b')).toBe("Turbo Console can't run a script named `a b` safely.");
    });

    it('WHEN the name holds a control character THEN the text shows it cleaned', () => {
      expect(unsafeScriptText('a\u0007\nb')).toBe("Turbo Console can't run a script named `a b` safely.");
    });

    it('WHEN the name is longer than a label THEN the text cuts it', () => {
      const text = unsafeScriptText('x'.repeat(LABEL_MAX * 2));

      expect(text).toBe(`Turbo Console can't run a script named \`${'x'.repeat(LABEL_MAX - 1)}…\` safely.`);
    });
  });
});
