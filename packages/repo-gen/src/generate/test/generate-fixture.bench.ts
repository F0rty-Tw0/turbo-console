import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import { PRESETS } from '../common/fixture.const.ts';
import { generateFixture } from '../domain-logic/fixture-generation.ts';

/** Each sample generates into its own fresh temp dir (generateFixture refuses a non-empty one); the timing includes removing it. */
const generateTargetLike = async (): Promise<void> => {
  const dir = await mkdtemp(join(tmpdir(), 'repo-gen-bench-'));

  try {
    await generateFixture(PRESETS['target-like'], dir);
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  }
};

const benches: BenchDescriptor[] = [bench('generate-target-like', generateTargetLike, { gate: false })];

export default benches;
