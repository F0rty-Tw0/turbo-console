import { PRESETS, warmFixtureCache } from '@turbo-console/repo-gen';

/**
 * Vitest global setup for the contract run: fills the shared fixture cache for the big presets once, before any worker
 * starts. Without it, each worker's `beforeAll` generated the 300-package stretch fixture alongside the other on a cold
 * cache, inside the 300 s hook timeout; on a slow windows-latest runner both hooks ran past it.
 */
export const setup = async (): Promise<void> => {
  await warmFixtureCache(PRESETS['stretch-300']);
  await warmFixtureCache(PRESETS['target-like']);
};
