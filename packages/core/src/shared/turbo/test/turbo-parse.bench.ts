import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';
import type { PresetName } from '@turbo-console/repo-gen';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';
import type { z } from 'zod';

import { dryRunSchema } from '../common/dry-run.schema.ts';
import { packageGraphSchema } from '../common/package-graph.schema.ts';
import { PACKAGE_GRAPH_QUERY } from '../common/turbo-query.const.ts';
import type { TurboResult } from '../common/turbo.type.ts';
import { queryTurbo } from '../data-access/query-turbo.ts';
import { runTurbo } from '../data-access/run-turbo.ts';
import { devTurboPath } from './utils/dev-turbo.spec.util.ts';

const TURBO = devTurboPath();

type CapturedOutput = {
  readonly packageGraph: string;
  readonly dryRun: string;
};

const DRY_RUN_ARGS = ['run', 'build', 'lint', 'typecheck', '--dry=json'];

const stdoutOf = (result: TurboResult, command: string): string => {
  if (result.exitCode !== 0) throw new Error(`turbo ${command} exited ${result.exitCode}: ${result.stderr}`);

  return result.stdout;
};

const captureOutput = async (preset: PresetName): Promise<CapturedOutput> => {
  const fixture = await fixtureFor(PRESETS[preset]);

  try {
    const graphResult = await queryTurbo(TURBO, PACKAGE_GRAPH_QUERY, fixture.dir);
    const dryRunResult = await runTurbo(TURBO, DRY_RUN_ARGS, fixture.dir);
    const output: CapturedOutput = { packageGraph: stdoutOf(graphResult, 'query'), dryRun: stdoutOf(dryRunResult, 'run --dry=json') };

    return output;
  } finally {
    await fixture.dispose();
  }
};

const parseBench = (name: string, stdout: string, schema: z.ZodType): BenchDescriptor => {
  const parse = (): unknown => schema.parse(JSON.parse(stdout));

  return bench(name, parse, { gate: true });
};

const targetLike = await captureOutput('target-like');
const stretch300 = await captureOutput('stretch-300');

const benches: BenchDescriptor[] = [
  parseBench('parse-package-graph-target-like', targetLike.packageGraph, packageGraphSchema),
  parseBench('parse-package-graph-stretch-300', stretch300.packageGraph, packageGraphSchema),
  parseBench('parse-dry-run-target-like', targetLike.dryRun, dryRunSchema),
  parseBench('parse-dry-run-stretch-300', stretch300.dryRun, dryRunSchema)
];

export default benches;
