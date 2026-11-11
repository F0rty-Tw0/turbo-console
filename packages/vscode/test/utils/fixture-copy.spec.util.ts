import { cp } from 'node:fs/promises';

import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';
import type { FixtureSpec } from '@turbo-console/repo-gen';

import { runEach } from './workspace.spec.util.ts';

/** A fresh copy of `spec` (`target-like` unless given) at `dir`, from repo-gen's cache, so no earlier launch's edits or turbo files reach it. */
export const copyFixture = async (dir: string, spec: FixtureSpec = PRESETS['target-like']): Promise<void> => {
  const fixture = await fixtureFor(spec);
  const copy = async (): Promise<void> => cp(fixture.dir, dir, { recursive: true });

  await runEach([copy, fixture.dispose]);
};
