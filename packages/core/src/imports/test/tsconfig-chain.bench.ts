import { rmSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import { TSCONFIG_CHAIN_MAX } from '../common/import-scan.const.ts';
import type { TsconfigPaths } from '../common/import-scan.type.ts';
import { readTsconfigPaths } from '../data-access/tsconfig-chain.ts';
import { writeImportTree } from './utils/import-tree.spec.util.ts';

const PATTERN_COUNT = 40;
const TWO_DIR = join('packages', 'a');
const EIGHT_DIR = join('packages', 'h');

const patternsOf = (): Record<string, string[]> => {
  const paths: Record<string, string[]> = {};

  for (let index = 0; index < PATTERN_COUNT; index++) paths[`@ws/p${index}/*`] = [`packages/p${index}/src/*`];

  return paths;
};

const configText = (config: Readonly<Record<string, unknown>>): string => JSON.stringify(config);

const baseConfigText = (): string => {
  const compilerOptions = { baseUrl: '.', paths: patternsOf() };

  return configText({ compilerOptions });
};

const twoFiles = (): Record<string, string> => {
  const extendsBase = { extends: '../../tsconfig.base.json' };
  const files: Record<string, string> = {};

  files['tsconfig.base.json'] = baseConfigText();
  files[`${TWO_DIR}/tsconfig.json`] = configText(extendsBase);

  return files;
};

/** `t0` is the package's own `tsconfig.json`; each file extends the next; the last one sets the patterns. */
const eightFiles = (): Record<string, string> => {
  const files: Record<string, string> = {};
  const last = TSCONFIG_CHAIN_MAX - 1;

  for (let link = 0; link < last; link++) {
    const name = link === 0 ? 'tsconfig.json' : `tsconfig.t${link}.json`;
    const next = { extends: `./tsconfig.t${link + 1}.json` };

    files[`${EIGHT_DIR}/${name}`] = configText(next);
  }

  files[`${EIGHT_DIR}/tsconfig.t${last}.json`] = baseConfigText();

  return files;
};

/**
 * `readTsconfigPaths` over a package whose tsconfig reaches the patterns in 2 files (this repo's shape: a package config
 * extending the root base) and in 8 files (`TSCONFIG_CHAIN_MAX`, the longest chain read). The tree is removed when the
 * process exits: the runner times every bench after loading every file, so no dispose can run earlier.
 */
const root = await mkdtemp(join(tmpdir(), 'tsconfig-chain-bench-'));

process.once('exit', () => rmSync(root, { recursive: true, force: true, maxRetries: 5 }));

const twoTree = twoFiles();
const eightTree = eightFiles();

await writeImportTree(root, { ...twoTree, ...eightTree });

const twoDir = join(root, TWO_DIR);
const eightDir = join(root, EIGHT_DIR);
const twoPrimed = await readTsconfigPaths(twoDir, root);
const eightPrimed = await readTsconfigPaths(eightDir, root);

const twoCount = Object.keys(twoPrimed?.paths ?? {}).length;
const eightCount = Object.keys(eightPrimed?.paths ?? {}).length;
const isComplete = twoCount === PATTERN_COUNT && eightCount === PATTERN_COUNT;

if (!isComplete) throw new Error(`tsconfig chain bench tree: read ${twoCount} and ${eightCount} of ${PATTERN_COUNT} patterns`);

const chainTwo = async (): Promise<TsconfigPaths | null> => readTsconfigPaths(twoDir, root);
const chainEight = async (): Promise<TsconfigPaths | null> => readTsconfigPaths(eightDir, root);

const benches: BenchDescriptor[] = [
  bench('tsconfig-chain-2', chainTwo, { gate: false }),
  bench('tsconfig-chain-8', chainEight, { gate: false })
];

export default benches;
