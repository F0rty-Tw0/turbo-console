import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GraphHostMessage, GraphPackageModulesMessage, GraphShowModulesMessage, ModuleLink } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { fixtureLinkOf } from './graph-explain-cases.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { MODULES_COMMAND } from '../common/graph.const.ts';
import type { GraphFixtureLink, GraphScene } from '../common/graph.type.ts';
import { ROOT_PACKAGE } from '../common/single-package.const.ts';

const SOURCE_FILE = 'src/u-mod-a.ts';

/** One file the case writes under the link source's `src`: its `name` there and its `text`. */
type ModuleFile = {
  readonly name: string;
  readonly text: string;
};

/**
 * `u-mod-a.ts` imports `u-mod-b` statically, `u-mod-c` type-only, the target bare, and `u-mod-d` twice lazily (a dynamic import and a
 * `require`); the other three are one `export` line each.
 */
const filesOf = (target: string): ModuleFile[] => {
  const lines = [
    "import { b } from './u-mod-b';",
    "import type { C } from './u-mod-c';",
    `import '${target}';`,
    "export const d = async (): Promise<unknown> => import('./u-mod-d');",
    "export const e: unknown = require('./u-mod-d');"
  ];
  const a: ModuleFile = { name: 'u-mod-a.ts', text: lines.join('\n') };
  const b: ModuleFile = { name: 'u-mod-b.ts', text: 'export const b = 1;' };
  const c: ModuleFile = { name: 'u-mod-c.ts', text: 'export type C = string;' };
  const d: ModuleFile = { name: 'u-mod-d.ts', text: 'export const value = 4;' };

  return [a, b, c, d];
};

const isModules = (message: GraphHostMessage): message is GraphPackageModulesMessage => message.type === 'packageModules';

const isShowModules = (message: GraphHostMessage): message is GraphShowModulesMessage => message.type === 'showModules';

/** The newest `packageModules` posted to the panel of `root` for `packageName`, `null` before there is one. */
const newestModulesFor = (api: TurboConsoleApi, root: string, packageName: string): GraphPackageModulesMessage | null => {
  const posted = api.graph.posted(root);
  let newest: GraphPackageModulesMessage | null = null;

  for (const message of posted) {
    if (isModules(message) && message.packageName === packageName) newest = message;
  }

  return newest;
};

/** The newest `showModules` posted to the panel of `root`, `null` before there is one. */
const newestShowModules = (api: TurboConsoleApi, root: string): GraphShowModulesMessage | null => {
  const posted = api.graph.posted(root);
  const requests = posted.filter(isShowModules);

  return requests.at(-1) ?? null;
};

const same = (link: ModuleLink, expected: ModuleLink): boolean => link.every((value, index): boolean => value === expected[index]);

const assertLink = (links: ModuleLink[], expected: ModuleLink): void => {
  const isFound = links.some((link): boolean => same(link, expected));

  assert.ok(isFound, `no link ${JSON.stringify(expected)} in ${JSON.stringify(links)}`);
};

const srcDirOf = (scene: GraphScene, link: GraphFixtureLink): string => {
  const pkg = scene.manifest.packages.find((candidate): boolean => candidate.name === link.source);

  if (pkg === undefined) throw new Error(`the manifest has no package ${link.source}`);

  return join(scene.root, pkg.path, 'src');
};

const writeModules = async (srcDir: string, files: ModuleFile[]): Promise<void> => {
  await mkdir(srcDir, { recursive: true });
  await Promise.all(files.map(async (file): Promise<void> => writeFile(join(srcDir, file.name), file.text)));
};

const isTabOf = (tab: vscode.Tab, fsPath: string): boolean => tab.input instanceof vscode.TabInputText && tab.input.uri.fsPath === fsPath;

/**
 * Closes the tabs of `u-mod-a.ts`, then removes only the four files `writeModules` wrote. Closing the active editor instead would
 * close the graph panel the later cases need: Show Package Modules brings it to the front while `activeTextEditor` still names the file.
 */
const removeModules = async (srcDir: string, files: ModuleFile[]): Promise<void> => {
  const fsPath = vscode.Uri.file(join(srcDir, 'u-mod-a.ts')).fsPath;
  const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
  const fileTabs = tabs.filter((tab): boolean => isTabOf(tab, fsPath));

  if (fileTabs.length > 0) await vscode.window.tabGroups.close(fileTabs);

  await Promise.all(files.map(async (file): Promise<void> => rm(join(srcDir, file.name), { force: true })));
};

const scanStep = async (scene: GraphScene, link: GraphFixtureLink): Promise<void> => {
  const { api, root } = scene;

  await api.graph.receive(root, { type: 'scanModules', packageName: link.source });
  await waitFor('package modules', () => newestModulesFor(api, root, link.source) !== null);

  const result = newestModulesFor(api, root, link.source)?.result;

  if (result?.kind !== 'found') throw new Error(`the reply is ${result?.kind ?? 'missing'}, not found`);

  const at = (file: string): number => result.files.indexOf(`src/${file}`);
  const stub = result.stubs.indexOf(link.target);

  assertLink(result.fileLinks, [at('u-mod-a.ts'), at('u-mod-b.ts'), 1, 0, 0]);
  assertLink(result.fileLinks, [at('u-mod-a.ts'), at('u-mod-c.ts'), 0, 1, 0]);
  assertLink(result.fileLinks, [at('u-mod-a.ts'), at('u-mod-d.ts'), 0, 0, 2]);
  assert.ok(stub >= 0, `${link.target} is not among the stubs ${JSON.stringify(result.stubs)}`);
  assertLink(result.stubLinks, [at('u-mod-a.ts'), stub, 1, 0, 0]);
  assert.equal(result.limit, null);
  assert.equal(result.dropped, 0);
};

const openStep = async (scene: GraphScene, link: GraphFixtureLink, srcDir: string): Promise<void> => {
  const { api, root } = scene;
  const expectedPath = vscode.Uri.file(join(srcDir, 'u-mod-a.ts')).fsPath;
  const isAtLine = (): boolean => {
    const editor = vscode.window.activeTextEditor;

    return editor?.document.uri.fsPath === expectedPath && editor.selection.active.line === 0;
  };

  await api.graph.receive(root, { type: 'openImport', packageName: link.source, file: SOURCE_FILE, line: 0 });
  await waitFor('modules file at line 0', isAtLine);

  assert.equal(vscode.window.activeTextEditor?.selection.active.character, 0);
};

const showStep = async (scene: GraphScene, link: GraphFixtureLink): Promise<void> => {
  const { api, root } = scene;
  const expected: GraphShowModulesMessage = { type: 'showModules', name: link.source };
  const isPosted = (): boolean => newestShowModules(api, root)?.name === link.source;

  await vscode.commands.executeCommand(MODULES_COMMAND, { kind: 'pkg', root, packageName: link.source });
  await waitFor('showModules post', isPosted);

  const commands = await vscode.commands.getCommands(true);

  assert.deepEqual(newestShowModules(api, root), expected);
  assert.ok(commands.includes(MODULES_COMMAND), `${MODULES_COMMAND} is not registered`);
};

/**
 * A `scanModules` request draws the link source's file links (by the §4.4 buckets) and its stub link to the target, an `openImport`
 * opens a modules file, and Show Package Modules on a package row posts `showModules` for it.
 */
export const modulesCase = async (scene: GraphScene): Promise<void> => {
  const link = await fixtureLinkOf(scene);
  const srcDir = srcDirOf(scene, link);
  const files = filesOf(link.target);

  try {
    await writeModules(srcDir, files);
    await step('L13-20: scanModules posts the file links and the stub link of the written files', async () => scanStep(scene, link));
    await step('L13-21: openImport with line 0 opens the modules file', async () => openStep(scene, link, srcDir));
    await step('L13-22: Show Package Modules on a package row posts showModules', async () => showStep(scene, link));
  } finally {
    await removeModules(srcDir, files);
  }
};

/** L11-12 (Review Focus 3): Show Package Modules on the single-package root posts `showModules` for `//`, and the host answers its scan. */
export const singlePackageModulesCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L11-12: Show Package Modules on // posts showModules and scanModules is answered', async () => {
    const isShown = (): boolean => newestShowModules(api, root)?.name === ROOT_PACKAGE;

    await vscode.commands.executeCommand(MODULES_COMMAND, { kind: 'pkg', root, packageName: ROOT_PACKAGE });
    await waitFor('showModules post', isShown);
    await api.graph.receive(root, { type: 'scanModules', packageName: ROOT_PACKAGE });
    await waitFor('package modules', () => newestModulesFor(api, root, ROOT_PACKAGE) !== null);

    assert.equal(newestModulesFor(api, root, ROOT_PACKAGE)?.result.kind, 'found');
  });
};
