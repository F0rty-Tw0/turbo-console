import { FAILED_TO_START_TEXT, SHOW_OUTPUT_ACTION } from '../common/run.const.ts';
import type { ShowError } from '../common/run.type.ts';

/** Spec §4.5: the failed to start notice, whose Show Output action opens the output channel. */
export const failedToStartNotice = (showError: ShowError, showOutput: () => void): (() => void) => {
  const onChoice = (choice: string | undefined): void => {
    if (choice === SHOW_OUTPUT_ACTION) showOutput();
  };

  return (): void => {
    void showError(FAILED_TO_START_TEXT, SHOW_OUTPUT_ACTION).then(onChoice);
  };
};
