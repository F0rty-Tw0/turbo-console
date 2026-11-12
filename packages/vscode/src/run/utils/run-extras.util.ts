import type { RunExtras } from '@turbo-console/core';

import type { RunPicks } from '../common/run-options.type.ts';

const NO_FIELD: RunExtras = {};

const onlyFieldOf = (isPicked: boolean): RunExtras => {
  if (!isPicked) return NO_FIELD;

  const field: RunExtras = { only: true };

  return field;
};

const continueFieldOf = (isPicked: boolean): RunExtras => {
  if (!isPicked) return NO_FIELD;

  const field: RunExtras = { continueMode: 'dependencies-successful' };

  return field;
};

const concurrencyFieldOf = (isPicked: boolean, concurrency: string | null): RunExtras => {
  if (!isPicked || concurrency === null) return NO_FIELD;

  const field: RunExtras = { concurrency };

  return field;
};

const passThroughFieldOf = (isPicked: boolean, args: string[]): RunExtras => {
  if (!isPicked || args.length === 0) return NO_FIELD;

  const field: RunExtras = { passThrough: args };

  return field;
};

export const extrasOf = (picks: RunPicks): RunExtras | null => {
  const isOnly = picks.options.includes('only');
  const isContinue = picks.options.includes('continue');
  const isConcurrency = picks.options.includes('concurrency');
  const isPassThrough = picks.options.includes('passThrough');
  const onlyField = onlyFieldOf(isOnly);
  const continueField = continueFieldOf(isContinue);
  const concurrencyField = concurrencyFieldOf(isConcurrency, picks.concurrency);
  const passThroughField = passThroughFieldOf(isPassThrough, picks.args);
  const extras: RunExtras = { ...onlyField, ...continueField, ...concurrencyField, ...passThroughField };
  const isEmpty = Object.keys(extras).length === 0;

  if (isEmpty) return null;

  return extras;
};
