import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import { sourceTokensOf } from '../utils/source-tokens.util.ts';
import { ONE_MIB } from './common/source-size.const.ts';
import { generatedSourceOf } from './utils/generated-source.spec.util.ts';

const SOURCE = generatedSourceOf(ONE_MIB);

const benches: BenchDescriptor[] = [bench('source-tokens-1mib', () => sourceTokensOf(SOURCE), { gate: true })];

export default benches;
