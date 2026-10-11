import { runBenchCompare } from './bench/feature/bench-compare.feature.ts';

const [baseDir, headDir] = process.argv.slice(2);

if (baseDir === undefined || headDir === undefined) {
  process.stderr.write('usage: bench-compare <base runs dir> <head runs dir>\n');
  process.exitCode = 2;
} else {
  process.exitCode = await runBenchCompare(baseDir, headDir);
}
