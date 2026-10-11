import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { PRESETS } from '../common/fixture.const.ts';
import type { FixtureSpec, PresetName } from '../common/fixture.type.ts';
import { isUsableOutDir, writeFixture } from '../domain-logic/fixture-generation.ts';

type CliValues = {
  readonly preset?: string | undefined;
  readonly seed?: string | undefined;
  readonly out?: string | undefined;
};

const USAGE = 'usage: repo-gen --preset=<name> [--seed=<n>] --out=<dir>\n';

/** mulberry32 keeps 32 bits of state, so larger seeds would alias smaller ones. */
const SEED_LIMIT = 2 ** 32;

const STRING_OPTION = { type: 'string' } as const;

const OPTIONS = { preset: STRING_OPTION, seed: STRING_OPTION, out: STRING_OPTION };

const SEED_PATTERN = /^\d+$/;

const isPresetName = (name: string): name is PresetName => Object.hasOwn(PRESETS, name);

const fail = (message: string): number => {
  process.stderr.write(message);

  return 2;
};

const parse = (args: string[]): CliValues | undefined => {
  try {
    const parsed = parseArgs({ args, options: OPTIONS, strict: true, allowPositionals: false });

    return parsed.values;
  } catch {
    return undefined;
  }
};

const generate = async (spec: FixtureSpec, out: string): Promise<number> => {
  try {
    const manifest = await writeFixture(spec, out);
    const counts = `${manifest.packages.length} packages, ${manifest.tasks.length} tasks`;

    process.stdout.write(`repo-gen: wrote ${out} (${counts}) and ${out}.manifest.json\n`);

    return 0;
  } catch (error) {
    const text = String(error);
    const message = error instanceof Error ? error.message : text;

    process.stderr.write(`repo-gen: ${message}\n`);

    return 1;
  }
};

/** `repo-gen --preset=<name> [--seed=<n>] --out=<dir>`: 0 on success, 1 when generation fails, 2 on bad arguments or a non-empty out dir. */
export const runGenerateCli = async (args: string[]): Promise<number> => {
  const values = parse(args);

  if (values?.preset === undefined) return fail(USAGE);

  if (values.out === undefined) return fail(USAGE);

  const { preset } = values;

  if (!isPresetName(preset)) {
    const names = Object.keys(PRESETS).join(', ');

    return fail(`repo-gen: unknown preset "${preset}"; valid presets: ${names}\n`);
  }

  const presetSpec = PRESETS[preset];
  const seedText = values.seed ?? String(presetSpec.seed);
  const isDigits = SEED_PATTERN.test(seedText);
  const seed = Number(seedText);
  const isSeedInRange = isDigits && seed < SEED_LIMIT;

  if (!isSeedInRange) return fail(`repo-gen: --seed must be an integer with 0 <= seed < ${SEED_LIMIT}, got "${seedText}"\n${USAGE}`);

  const spec: FixtureSpec = { ...presetSpec, seed };
  const out = resolve(values.out);
  const isUsable = await isUsableOutDir(out);

  if (!isUsable) return fail(`repo-gen: ${out} is not empty; pass a new or empty --out dir\n`);

  return generate(spec, out);
};
