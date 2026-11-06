import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ImportSite } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { fixtureLinkOf } from './graph-explain-cases.spec.util.ts';
import { importsFor } from './graph-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { GraphFixtureLink, GraphScene } from '../common/graph.type.ts';

const SOURCE_FILE = 'src/u8-imports.ts';
const CLOSE_EDITOR = 'workbench.action.closeActiveEditor';

/** What the case wrote: the dependent's dir, its source file and a file under its `node_modules`; a `finally` removes them. */
type WrittenImports = {
  readonly dir: string;
  readonly source: string;
  readonly dependency: string;
};

/** The two lines the case writes into the dependent's `src`: a type-only static import and a dynamic import of a subpath of the target. */
const linesOf = (target: string): string[] => {
  const typeLine = `import type { Thing } from '${target}';`;
  const dynamicLine = `export const load = async (): Promise<unknown> => import('${target}/sub');`;

  return [typeLine, dynamicLine];
};

const writeAll = async (path: string, text: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
};

/** Writes the dependent's `src/u8-imports.ts`, plus a file under `node_modules` the walk must not enter (no `package.json`, so no package reload). */
const writeImports = async (dir: string, link: GraphFixtureLink): Promise<WrittenImports> => {
  const source = join(dir, 'src', 'u8-imports.ts');
  const dependency = join(dir, 'node_modules', 'x', 'index.ts');

  await writeAll(source, linesOf(link.target).join('\n'));
  await writeAll(dependency, `import '${link.target}';`);

  const written: WrittenImports = { dir, source, dependency };

  return written;
};

const sitesOf = (target: string): ImportSite[] => {
  const [typeLine, dynamicLine] = linesOf(target);
  const typeSite: ImportSite = {
    file: SOURCE_FILE,
    line: 0,
    specifier: target,
    text: typeLine ?? '',
    kind: 'static',
    isType: true,
    via: 'name'
  };
  const dynamicSite: ImportSite = {
    file: SOURCE_FILE,
    line: 1,
    specifier: `${target}/sub`,
    text: dynamicLine ?? '',
    kind: 'dynamic',
    isType: false,
    via: 'name'
  };

  return [typeSite, dynamicSite];
};

const closeIfActive = async (path: string): Promise<void> => {
  const active = vscode.window.activeTextEditor?.document.uri.fsPath;

  if (active === vscode.Uri.file(path).fsPath) await vscode.commands.executeCommand(CLOSE_EDITOR);
};

const removeImports = async (written: WrittenImports): Promise<void> => {
  await closeIfActive(written.source);
  await rm(written.source, { force: true });
  await rm(join(written.dir, 'node_modules'), { force: true, recursive: true });
};

const scanStep = async (scene: GraphScene, link: GraphFixtureLink): Promise<void> => {
  const { api, root } = scene;
  const isReplied = (): boolean => importsFor(api, root, link.source, link.target) !== null;

  await api.graph.receive(root, { type: 'scanImports', source: link.source, target: link.target });
  await waitFor('edge imports', isReplied);

  const result = importsFor(api, root, link.source, link.target)?.result;

  if (result?.kind !== 'found') throw new Error(`the reply is ${result?.kind ?? 'missing'}, not found`);

  assert.deepEqual(result.sites, sitesOf(link.target));
  assert.equal(result.total, 2);
  assert.equal(result.skipped, 0);
  assert.equal(result.limit, null);
};

const openStep = async (scene: GraphScene, link: GraphFixtureLink, written: WrittenImports): Promise<void> => {
  const { api, root } = scene;
  const expectedPath = vscode.Uri.file(written.source).fsPath;
  const isAtLine = (): boolean => {
    const editor = vscode.window.activeTextEditor;

    return editor?.document.uri.fsPath === expectedPath && editor.selection.active.line === 1;
  };

  await api.graph.receive(root, { type: 'openImport', packageName: link.source, file: SOURCE_FILE, line: 1 });
  await waitFor('import site at line 1', isAtLine);

  assert.equal(vscode.window.activeTextEditor?.selection.active.character, 0);
};

/** A `scanImports` request lists the dependent's `src` imports of the link's target, and an `openImport` opens one of them at its line. */
export const importsCase = async (scene: GraphScene): Promise<void> => {
  const link = await fixtureLinkOf(scene);
  const pkg = scene.manifest.packages.find((candidate): boolean => candidate.name === link.source);

  if (pkg === undefined) throw new Error(`the manifest has no package ${link.source}`);

  const written = await writeImports(join(scene.root, pkg.path), link);

  try {
    await step("L13-18: scanImports lists the link's two src imports of its target", async () => scanStep(scene, link));
    await step("L13-19: openImport opens the dynamic import's line", async () => openStep(scene, link, written));
  } finally {
    await removeImports(written);
  }
};
