import { rmSync } from 'node:fs';

import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';
import type { PresetName } from '@turbo-console/repo-gen';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import { packageGraphSchema } from '../../shared/turbo/common/package-graph.schema.ts';
import { PACKAGE_GRAPH_QUERY } from '../../shared/turbo/common/turbo-query.const.ts';
import { queryTurbo } from '../../shared/turbo/data-access/query-turbo.ts';
import { devTurboPath } from '../../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { hashKeyedFiles } from '../data-access/keyed-files.ts';
import { cacheKeyOf, keyedPathsOf } from '../utils/cache-key.util.ts';

const TURBO = devTurboPath();

/**
 * `hashKeyedFiles` + `cacheKeyOf` over the keyed paths of a fresh `preset` copy. The copy stays on disk while timed and
 * is removed when the process exits: the runner times every bench after loading every file, so no dispose can run earlier.
 */
const keyBench = async (name: string, preset: PresetName): Promise<BenchDescriptor> => {
  const fixture = await fixtureFor(PRESETS[preset]);
  const removeFixture = (): void => rmSync(fixture.dir, { recursive: true, force: true, maxRetries: 5 });

  process.once('exit', removeFixture);

  const result = await queryTurbo(TURBO, PACKAGE_GRAPH_QUERY, fixture.dir);

  if (result.exitCode !== 0) throw new Error(`turbo query exited ${result.exitCode}: ${result.stderr}`);

  const json: unknown = JSON.parse(result.stdout);
  const graph = packageGraphSchema.parse(json);
  const paths = keyedPathsOf(graph.data.packageGraph.nodes.items);

  const key = async (): Promise<string> => {
    const files = await hashKeyedFiles(fixture.dir, paths);

    return cacheKeyOf(files, '2.11.7');
  };

  return bench(name, key, { gate: false });
};

const benches: BenchDescriptor[] = [
  await keyBench('cache-key-target-like', 'target-like'),
  await keyBench('cache-key-stretch-300', 'stretch-300')
];

export default benches;
