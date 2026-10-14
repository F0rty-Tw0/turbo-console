/** npm name of this package. */
export const PACKAGE_NAME = '@turbo-console/repo-gen';

export { PRESETS } from './generate/common/fixture.const.ts';

export { fixtureFor, warmFixtureCache } from './generate/domain-logic/fixture-for.ts';

export { applyEdit, generateFixture } from './generate/domain-logic/fixture-generation.ts';

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
