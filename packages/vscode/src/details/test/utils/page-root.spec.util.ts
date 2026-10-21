import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PageRoot } from '../../../shared/test/common/page-root.type.ts';
import { DETAILS_ASSET_DIR } from '../../common/details.const.ts';

/** A temp extension root whose page folder holds the details page template; `dispose` deletes it. */
export const copyPageRoot = (): PageRoot => {
  const root = mkdtempSync(join(tmpdir(), 'details-page-'));
  const assetDir = join(root, ...DETAILS_ASSET_DIR);
  const template = join(import.meta.dirname, '../fixtures/details-page/index.html');

  mkdirSync(assetDir, { recursive: true });
  copyFileSync(template, join(assetDir, 'index.html'));

  const dispose = (): void => {
    rmSync(root, { recursive: true, force: true });
  };
  const pageRoot: PageRoot = { root, dispose };

  return pageRoot;
};
