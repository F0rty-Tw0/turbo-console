import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';

/**
 * Vitest global setup for the contract run: fills the shared fixture cache once, before any worker starts. On a cold
 * cache each worker's `beforeAll` otherwise generated the 300-package stretch fixture at the same time as the other,
 * and on windows-latest the two contending generations ran past the 300 s hook timeout.
 */
export const setup = async (): Promise<void> => {
  const stretch = await fixtureFor(PRESETS['stretch-300']);

  await stretch.dispose();

  const targetLike = await fixtureFor(PRESETS['target-like']);

  await targetLike.dispose();
};
