import { basename, dirname } from 'node:path';

import type { FixtureFile, FixtureSpec, Manifest } from '../common/fixture.type.ts';
import { appendToFiles, writeFiles } from '../data-access/fixture-files.ts';
import { git } from '../data-access/git.ts';
import { buildManifest } from '../utils/build-manifest.util.ts';
import { toJsonFile } from '../utils/json-file.util.ts';
import { planFixture, renderFixtureFiles } from '../utils/render-fixture.util.ts';

const EDIT_LINE = '\n// edit\n';

const commitAll = async (dir: string, message: string): Promise<void> => {
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '--quiet', '-m', message]);
};

/** Writes rendered files into `dir`, then commits them as "base" on a new `main` branch. */
export const commitBaseRepo = async (dir: string, files: FixtureFile[]): Promise<void> => {
  await writeFiles(dir, files);
  await git(dir, ['init', '--quiet', '-b', 'main']);
  await commitAll(dir, 'base');
};

/** Plans and writes the fixture repo into `dir`, then commits it as "base" on a new `main` branch. */
export const generateFixture = async (spec: FixtureSpec, dir: string): Promise<Manifest> => {
  const plan = planFixture(spec);
  const files = renderFixtureFiles(plan);

  await commitBaseRepo(dir, files);

  return buildManifest(plan, plan.atomGroups);
};

/** `generateFixture`, plus the manifest at `<dir>.manifest.json`, beside the repo so it never enters task hashes. */
export const writeFixture = async (spec: FixtureSpec, dir: string): Promise<Manifest> => {
  const manifest = await generateFixture(spec, dir);
  const manifestFile = toJsonFile(`${basename(dir)}.manifest.json`, manifest);

  await writeFiles(dirname(dir), [manifestFile]);

  return manifest;
};

/** Appends one comment line to each path (posix-relative to `dir`) and commits the change as "head". */
export const applyEdit = async (dir: string, paths: string[]): Promise<void> => {
  await appendToFiles(dir, paths, EDIT_LINE);
  await commitAll(dir, 'head');
};
