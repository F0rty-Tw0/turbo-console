/** npm name of this package. */
export const PACKAGE_NAME = '@turbo-console/repo-gen';

export { FIXTURE_PACKAGE_MANAGER, PRESETS } from './generate/common/fixture.const.ts';

export { PNPM_ENV_LOCKFILE } from './generate/common/pnpm-env-lockfile.const.ts';

export { fixtureFor, warmFixtureCache } from './generate/domain-logic/fixture-for.ts';

export { applyEdit, commitBaseRepo, generateFixture } from './generate/domain-logic/fixture-generation.ts';

export type {
  FixtureFile,
  FixtureHandle,
  FixtureSpec,
  Manifest,
  ManifestAtom,
  ManifestPackage,
  ManifestTask,
  PackageRole,
  PresetName,
  TaskKind
} from './generate/common/fixture.type.ts';
