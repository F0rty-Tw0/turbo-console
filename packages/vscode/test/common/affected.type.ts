import type { ShownManifest, ShownPackage, SpawnCounter, SuiteEnv } from './launch.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

export type AffectedMarkKind = 'changed' | 'dependency';

/** `task`: turbo reads task inputs (`futureFlags.affectedUsingTaskInputs`); `package`: a changed package affects all its tasks. */
export type OracleMode = 'task' | 'package';

/** One edited file: `file` is relative to the package. */
export type AffectedEdit = {
  readonly packageName: string;
  readonly file: string;
};

/**
 * The three packages the affected cases edit: `readme` gets a README commit (no dependency, no dependent), `leaf` a
 * source edit (nothing depends on it), `atomDependency` a source edit (the first dependency of the first atom test package).
 */
export type AffectedEdits = {
  readonly readme: ShownPackage;
  readonly leaf: ShownPackage;
  readonly atomDependency: ShownPackage;
};

/** What the affected cases share: the window's api and env, the first root, the spawn counter, the manifest and the edited packages. */
export type AffectedScene = {
  readonly api: TurboConsoleApi;
  readonly env: SuiteEnv;
  readonly root: string;
  readonly counter: SpawnCounter;
  readonly manifest: ShownManifest;
  readonly edits: AffectedEdits;
};
