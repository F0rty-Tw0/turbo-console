import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';
import type { PresetName } from '@turbo-console/repo-gen';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import { packageGraphSchema } from '../../shared/turbo/common/package-graph.schema.ts';
import { PACKAGE_GRAPH_QUERY } from '../../shared/turbo/common/turbo-query.const.ts';
import type { GraphPackage, PackageGraph } from '../../shared/turbo/common/turbo.type.ts';
import { queryTurbo } from '../../shared/turbo/data-access/query-turbo.ts';
import { devTurboPath } from '../../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';
import type { TurboConfigFile } from '../common/turbo-config.type.ts';
import { readTurboConfigs } from '../data-access/turbo-config.ts';
import { buildWorkspaceModel } from '../utils/workspace-model.util.ts';

type CapturedInput = {
  readonly graph: PackageGraph;
  readonly configs: TurboConfigFile[];
};

const TURBO = devTurboPath();

const configDirOf = (pkg: GraphPackage): string => toPosixPath(pkg.path);

/** The parsed `packageGraph` of a fresh `preset` fixture and the configs `loadWorkspace` would read for it. */
const captureInput = async (preset: PresetName): Promise<CapturedInput> => {
  const fixture = await fixtureFor(PRESETS[preset]);

  try {
    const result = await queryTurbo(TURBO, PACKAGE_GRAPH_QUERY, fixture.dir);

    if (result.exitCode !== 0) throw new Error(`turbo query exited ${result.exitCode}: ${result.stderr}`);

    const json: unknown = JSON.parse(result.stdout);
    const graph = packageGraphSchema.parse(json);
    const dirs = graph.data.packageGraph.nodes.items.map(configDirOf);
    const configs = await readTurboConfigs(fixture.dir, dirs);
    const input: CapturedInput = { graph, configs };

    return input;
  } finally {
    await fixture.dispose();
  }
};

const modelBench = (name: string, input: CapturedInput): BenchDescriptor => {
  const build = (): unknown => buildWorkspaceModel(input.graph, input.configs, '2.11.7', '/bench');

  return bench(name, build, { gate: true });
};

const targetLike = await captureInput('target-like');
const stretch300 = await captureInput('stretch-300');

const benches: BenchDescriptor[] = [
  modelBench('workspace-model-target-like', targetLike),
  modelBench('workspace-model-stretch-300', stretch300)
];

export default benches;
