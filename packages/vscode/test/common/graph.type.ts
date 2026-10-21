import type { ShownManifest } from './launch.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/** What L13's cases share: the window's api, the first root and the fixture manifest. */
export type GraphScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly manifest: ShownManifest;
};
