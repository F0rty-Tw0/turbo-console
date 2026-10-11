import { runBenchesCli } from './bench/feature/run-benches.feature.ts';

process.exitCode = await runBenchesCli(process.cwd());
