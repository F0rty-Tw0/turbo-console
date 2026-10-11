import { runGenerateCli } from './generate/feature/generate-cli.ts';

process.exitCode = await runGenerateCli(process.argv.slice(2));
