import { fixtureFor } from '@turbo-console/repo-gen';
import type { FixtureHandle, FixtureSpec } from '@turbo-console/repo-gen';
import { afterAll, beforeAll } from 'vitest';

/**
 * Registers `beforeAll`/`afterAll` hooks in the calling `describe` that create a private fixture copy for `spec` and
 * dispose it. Returns a getter that throws until the copy exists.
 */
export const fixtureHook = (spec: FixtureSpec): (() => FixtureHandle) => {
  let handle: FixtureHandle | undefined;

  beforeAll(async () => {
    handle = await fixtureFor(spec);
  });

  afterAll(async () => {
    await handle?.dispose();
  });

  return (): FixtureHandle => {
    if (handle === undefined) throw new Error('fixture is not ready: its beforeAll failed or has not run');

    return handle;
  };
};
