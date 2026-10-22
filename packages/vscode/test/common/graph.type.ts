import type { ManifestContext } from '@turbo-console/webview-ui';

import type { ShownManifest } from './launch.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/** What L13's cases share: the window's api, the first root and the fixture manifest. */
export type GraphScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly manifest: ShownManifest;
};

/** A dependency link of the fixture, read from the dependent's own `package.json`: its absolute `file`, the `dependencies` entry's `spec` and its zero-based `line`, and the `context` lines around it. */
export type GraphFixtureLink = {
  readonly source: string;
  readonly target: string;
  readonly file: string;
  readonly spec: string;
  readonly line: number;
  readonly context: ManifestContext;
};
