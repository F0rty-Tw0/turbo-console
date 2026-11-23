import { join } from 'node:path';

import type { PackageImportScan } from '@turbo-console/core';
import type {
  GraphModuleSitesMessage,
  GraphPackageModulesMessage,
  GraphState,
  ModuleEnd,
  ModuleSite,
  ModuleSitesFound,
  ModuleSitesResult,
  ModulesFound
} from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { ImportScans } from './import-scans.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';
import { importScanOf, scannedFileOf, sourceImportOf } from '../test/utils/import-scan.spec.util.ts';
import { pendingScanOf, postedOf, scanInputsOf, scansGateOf } from '../test/utils/import-scans.spec.util.ts';

const WEB_DIR = join(IMPORT_ROOT, 'apps', 'web');
const WEB_MANIFEST = join(WEB_DIR, 'package.json');
const IMPORTS_A = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('a', 0)])]);
const NO_COUNTS = { unresolved: 0, external: 0, assets: 0, self: 0 };
const FOUND_WEB: ModulesFound = {
  kind: 'found',
  files: ['src/x.ts'],
  tests: [],
  stubs: ['a'],
  fileLinks: [],
  stubLinks: [[0, 0, 1, 0, 0]],
  counts: NO_COUNTS,
  scanned: 1,
  skipped: 0,
  limit: null,
  dropped: 0
};
const MODULES_WEB: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: FOUND_WEB };
const X_END: ModuleEnd = { kind: 'file', path: 'src/x.ts' };
const SRC_END: ModuleEnd = { kind: 'dir', path: 'src' };
const A_STUB: ModuleSite['target'] = { kind: 'stub', name: 'a' };
const SITE_X_TO_A: ModuleSite = {
  file: 'src/x.ts',
  line: 0,
  text: "import x from 'a';",
  kind: 'static',
  isType: false,
  target: A_STUB
};
const FOUND_SITES: ModuleSitesFound = {
  kind: 'found',
  imports: [SITE_X_TO_A],
  importsTotal: 1,
  importedBy: [],
  importedByTotal: 0,
  limit: null
};
const SITES_WEB: GraphModuleSitesMessage = { type: 'moduleSites', packageName: 'web', from: X_END, to: null, result: FOUND_SITES };
const FAILED_SITES: ModuleSitesResult = { kind: 'failed' };
const FAILED_WEB: GraphModuleSitesMessage = { type: 'moduleSites', packageName: 'web', from: X_END, to: null, result: FAILED_SITES };
const LOADING: GraphState = { kind: 'loading' };
const FOUND_KIND = { kind: 'found' };
const MODULES_OF_A = { type: 'packageModules', packageName: 'a', result: FOUND_KIND };

describe('FEATURE: module sites asks of the import scans of one panel', () => {
  let ports: GraphPorts;
  let canPost: Mock<() => boolean>;
  let state: GraphState;
  let scans: ImportScans;

  beforeEach(() => {
    ports = graphPortsMock();
    canPost = vi.fn<() => boolean>(() => true);
    state = GRAPH_STATE_STUB;
    scans = new ImportScans(scansGateOf(ports, { canPost, state: () => state }));
  });

  describe('GIVEN an idle queue', () => {
    it('WHEN web sites are asked and the scan resolves THEN apps/web is scanned, its manifest read and one moduleSites posted', async () => {
      vi.mocked(ports.scanImports).mockResolvedValue(IMPORTS_A);

      await scans.askModuleSites('web', X_END, null);

      expect(scanInputsOf(ports)[0]).toMatchObject({ dir: WEB_DIR });
      expect(ports.readText).toHaveBeenCalledWith(WEB_MANIFEST);
      expect(postedOf(ports)).toStrictEqual([SITES_WEB]);
    });

    it.each([
      ['an unlisted package', 'ghost', GRAPH_STATE_STUB],
      ["a state that is not a graph ({ kind: 'loading' })", 'web', LOADING]
    ])('WHEN %s is asked THEN failed is posted at once and nothing is scanned', async (_label, packageName, now) => {
      state = now;

      await scans.askModuleSites(packageName, X_END, null);

      expect(postedOf(ports)).toStrictEqual([{ type: 'moduleSites', packageName, from: X_END, to: null, result: FAILED_SITES }]);
      expect(ports.scanImports).not.toHaveBeenCalled();
    });

    it('WHEN the scan rejects with an error THEN failed is posted and the error is logged once', async () => {
      vi.mocked(ports.scanImports).mockRejectedValue(new Error('EMFILE'));

      await scans.askModuleSites('web', X_END, null);

      expect(postedOf(ports)).toStrictEqual([FAILED_WEB]);
      expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('EMFILE'));
    });

    it('WHEN disposed before the ask THEN nothing is scanned or posted', async () => {
      scans.dispose();

      await scans.askModuleSites('web', X_END, null);

      expect(ports.scanImports).not.toHaveBeenCalled();
      expect(ports.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a modules scan of web in flight', () => {
    it('WHEN web sites are asked and the scan resolves THEN both join one scan and post in settle order', async () => {
      const pending = pendingScanOf(ports);
      const first = scans.askModules('web');
      const second = scans.askModuleSites('web', X_END, null);

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(ports.scanImports).toHaveBeenCalledTimes(1);
      expect(postedOf(ports)).toStrictEqual([MODULES_WEB, SITES_WEB]);
    });
  });

  describe('GIVEN a sites scan of web in flight', () => {
    let pending: PromiseWithResolvers<PackageImportScan>;
    let first: Promise<void>;

    beforeEach(() => {
      pending = pendingScanOf(ports);
      first = scans.askModuleSites('web', X_END, null);
    });

    it("WHEN a modules are asked THEN web's signal is aborted, no moduleSites is posted and a's packageModules is", async () => {
      const second = scans.askModules('a');
      const [webInput] = scanInputsOf(ports);

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(webInput?.signal.aborted).toBe(true);
      expect(postedOf(ports)).toMatchObject([MODULES_OF_A]);
    });

    it('WHEN web sites are asked again with the same ends THEN it joins: one scan and one post', async () => {
      const second = scans.askModuleSites('web', X_END, null);

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(ports.scanImports).toHaveBeenCalledTimes(1);
      expect(ports.post).toHaveBeenCalledTimes(1);
    });

    it('WHEN web sites are asked for another end THEN one scan answers both: two posts', async () => {
      const second = scans.askModuleSites('web', SRC_END, null);

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(ports.scanImports).toHaveBeenCalledTimes(1);
      expect(ports.post).toHaveBeenCalledTimes(2);
    });

    it('WHEN web stops being listed before the scan resolves THEN nothing is posted', async () => {
      const packages = GRAPH_STATE_STUB.packages.filter((pkg) => pkg.name !== 'web');

      state = { ...GRAPH_STATE_STUB, packages };
      pending.resolve(IMPORTS_A);
      await first;

      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN the panel cannot post when the scan resolves THEN nothing is posted', async () => {
      canPost.mockReturnValue(false);
      pending.resolve(IMPORTS_A);
      await first;

      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN disposed THEN the signal is aborted and nothing is posted after the scan resolves anyway', async () => {
      const [input] = scanInputsOf(ports);

      scans.dispose();
      pending.resolve(IMPORTS_A);
      await first;

      expect(input?.signal.aborted).toBe(true);
      expect(ports.post).not.toHaveBeenCalled();
    });
  });
});
