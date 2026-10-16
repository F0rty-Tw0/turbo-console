import type { ShownManifest, SpawnCounter } from './launch.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/** What L8's cases share: the window's api, the first root, a package with a `build` task (`taskId`) and the spawn counter. */
export type DetailsScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly packageName: string;
  readonly taskId: string;
  readonly manifest: ShownManifest;
  readonly counter: SpawnCounter;
};
