import { describe, expect, it } from 'vitest';

import { failedToStartText, noScriptText, startTimeoutText, startWaitText, unsafeScriptText } from './run-text.util.ts';
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

    it('WHEN the name is markdown link syntax THEN the text holds no link, as a toast would render it clickable', () => {
      const text = unsafeScriptText('[x](command:workbench.action.showCommands)');

      expect(text).not.toContain('](');
      expect(text).toBe("Turbo Console can't run a script named `[x] (command:workbench.action.showCommands)` safely.");
    });

    it('WHEN the name is longer than a label THEN the text cuts it', () => {
      const text = unsafeScriptText('x'.repeat(LABEL_MAX * 2));

      expect(text).toBe(`Turbo Console can't run a script named \`${'x'.repeat(LABEL_MAX - 1)}…\` safely.`);
    });
  });

  describe('GIVEN a task with no package.json script', () => {
    it('WHEN the no-script text is made THEN it says the task runs only through turbo', () => {
      expect(noScriptText('build')).toBe('`build` has no package.json script, so it runs only through turbo.');
    });

    it('WHEN the name is markdown link syntax THEN the text holds no link', () => {
      const text = noScriptText('[x](command:workbench.action.showCommands)');

      expect(text).toBe('`[x] (command:workbench.action.showCommands)` has no package.json script, so it runs only through turbo.');
    });

    it('WHEN the name is longer than a label THEN the text cuts it', () => {
      const text = noScriptText('x'.repeat(LABEL_MAX * 2));

      expect(text).toBe(`\`${'x'.repeat(LABEL_MAX - 1)}…\` has no package.json script, so it runs only through turbo.`);
    });
  });
});
