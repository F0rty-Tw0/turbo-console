import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { failedToStartNotice } from './run-notice.util.ts';
import type { ShowError } from '../common/run.type.ts';

describe('FEATURE: the failed to start notice', () => {
  let showOutput: Mock<() => void>;

  beforeEach(() => {
    showOutput = vi.fn<() => void>();
  });

  it('GIVEN a failed start WHEN the notice shows THEN it says turbo could not start and offers the output', () => {
    const showError = vi.fn<ShowError>().mockResolvedValue(undefined);

    failedToStartNotice(showError, showOutput)();

    expect(showError).toHaveBeenCalledExactlyOnceWith("Couldn't start turbo.", 'Show Output');
  });

  describe('GIVEN the notice is showing', () => {
    it('WHEN the user picks Show Output THEN the output shows', async () => {
      const choice = Promise.resolve('Show Output');
      const showError = vi.fn<ShowError>().mockReturnValue(choice);

      failedToStartNotice(showError, showOutput)();
      await choice;

      expect(showOutput).toHaveBeenCalledOnce();
    });

    it('WHEN the user closes it THEN the output stays hidden', async () => {
      const choice = Promise.resolve(undefined);
      const showError = vi.fn<ShowError>().mockReturnValue(choice);

      failedToStartNotice(showError, showOutput)();
      await choice;

      expect(showOutput).not.toHaveBeenCalled();
    });
  });
});
