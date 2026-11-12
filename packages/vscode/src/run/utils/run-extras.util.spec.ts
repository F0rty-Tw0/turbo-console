import type { RunExtras } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { extrasOf } from './run-extras.util.ts';
import type { RunOption, RunPicks } from '../common/run-options.type.ts';

const NONE: RunPicks = { options: [], concurrency: null, args: [] };
const ALL: RunOption[] = ['force', 'only', 'continue', 'concurrency', 'passThrough'];

const FORCE_PICKS: RunPicks = { ...NONE, options: ['force'] };
const ONLY_PICKS: RunPicks = { ...NONE, options: ['only'] };
const CONTINUE_PICKS: RunPicks = { ...NONE, options: ['continue'] };
const CONC_PICKS: RunPicks = { options: ['concurrency'], concurrency: '4', args: [] };
const ARGS_PICKS: RunPicks = { options: ['passThrough'], concurrency: null, args: ['--watch'] };
const EMPTY_ARGS_PICKS: RunPicks = { ...NONE, options: ['passThrough'] };
const ONLY_EMPTY_ARGS_PICKS: RunPicks = { ...NONE, options: ['only', 'passThrough'] };
const UNPICKED_CONC: RunPicks = { options: ['only'], concurrency: '4', args: [] };
const ALL_PICKS: RunPicks = { options: ALL, concurrency: '50%', args: ['--watch'] };

const ONLY_EXTRAS: RunExtras = { only: true };
const CONTINUE_EXTRAS: RunExtras = { continueMode: 'dependencies-successful' };
const CONC_EXTRAS: RunExtras = { concurrency: '4' };
const ARGS_EXTRAS: RunExtras = { passThrough: ['--watch'] };
const ALL_EXTRAS: RunExtras = {
  only: true,
  continueMode: 'dependencies-successful',
  concurrency: '50%',
  passThrough: ['--watch']
};

describe('FEATURE: extras from the Run with Options picks', () => {
  it.each([
    ['no picks', NONE, null],
    ['force only (force lives on the request)', FORCE_PICKS, null],
    ['only', ONLY_PICKS, ONLY_EXTRAS],
    ['continue', CONTINUE_PICKS, CONTINUE_EXTRAS],
    ['concurrency "4"', CONC_PICKS, CONC_EXTRAS],
    ['passThrough with args', ARGS_PICKS, ARGS_EXTRAS],
    ['passThrough with no args, alone', EMPTY_ARGS_PICKS, null],
    ['only + passThrough with no args (no passThrough key)', ONLY_EMPTY_ARGS_PICKS, ONLY_EXTRAS],
    ['concurrency given but not picked (the options decide)', UNPICKED_CONC, ONLY_EXTRAS],
    ['all five', ALL_PICKS, ALL_EXTRAS]
  ])('GIVEN %s WHEN extras are built THEN %j', (_name, picks, expected) => {
    expect(extrasOf(picks)).toStrictEqual(expected);
  });
});
