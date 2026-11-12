import { CONCURRENCY_VALUE } from '@turbo-console/core';

import { CONCURRENCY_MESSAGE } from '../common/run-options.const.ts';

export const concurrencyError = (text: string): string | null => {
  const isValid = CONCURRENCY_VALUE.test(text.trim());

  if (isValid) return null;

  return CONCURRENCY_MESSAGE;
};
