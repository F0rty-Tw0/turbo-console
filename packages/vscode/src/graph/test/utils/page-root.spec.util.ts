import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PageRoot } from '../../../details/test/common/page-root.type.ts';
import { GRAPH_ASSET_DIR } from '../../common/graph.const.ts';

/** A temp extension root whose page folder holds the graph page template; `dispose` deletes it. */
export const copyGraphPageRoot = (): PageRoot => {
  const root = mkdtempSync(join(tmpdir(), 'graph-page-'));
  const assetDir = join(root, ...GRAPH_ASSET_DIR);
  const template = join(import.meta.dirname, '../fixtures/graph-page/index.html');

  mkdirSync(assetDir, { recursive: true });
  copyFileSync(template, join(assetDir, 'index.html'));

  const dispose = (): void => {
    rmSync(root, { recursive: true, force: true });
  };
  const pageRoot: PageRoot = { root, dispose };

  return pageRoot;
};
