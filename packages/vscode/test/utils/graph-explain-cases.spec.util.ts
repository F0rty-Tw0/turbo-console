import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { explainedFor, lastGraphState } from './graph-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import { ROOT_PACKAGE_NAME } from '../common/graph.const.ts';
import type { GraphFixtureLink, GraphScene } from '../common/graph.type.ts';

const MANIFEST_FILE = 'package.json';
const BREAK = /\r\n|[\r\n]/;

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

/** The string value of `dependencies[target]`, read from the parsed manifest through `Object.entries`. */
const readSpec = (parsed: unknown, target: string): string => {
  if (!isObject(parsed) || !('dependencies' in parsed)) throw new Error('the fixture manifest has no dependencies');

  const { dependencies } = parsed;

  if (!isObject(dependencies)) throw new Error('the fixture manifest has no dependencies');

  const entry = Object.entries(dependencies).find(([key]): boolean => key === target);

  if (entry === undefined || typeof entry[1] !== 'string') throw new Error(`the fixture manifest has no dependency ${target}`);

  return entry[1];
};

/** The first graph edge whose dependent is a manifest package, with its entry's spec and line found independently of the host's parser. */
const fixtureLinkOf = async (scene: GraphScene): Promise<GraphFixtureLink> => {
  const { api, root, manifest } = scene;
  const state = lastGraphState(api, root);

  if (state === null) throw new Error('no graph state was posted');

  const isManifestSource = (name: string): boolean =>
    name !== ROOT_PACKAGE_NAME && manifest.packages.some((pkg): boolean => pkg.name === name);
  const edge = state.edges.find((candidate): boolean => isManifestSource(candidate.source));
  const pkg = manifest.packages.find((candidate): boolean => candidate.name === edge?.source);

  if (edge === undefined || pkg === undefined) throw new Error('the graph has no edge from a manifest package');

  const file = join(root, pkg.path, MANIFEST_FILE);
  const text = await readFile(file, 'utf8');
  const lines = text.split(BREAK);
  const line = lines.findIndex((row): boolean => row.trimStart().startsWith(`${JSON.stringify(edge.target)}:`));
  const spec = readSpec(JSON.parse(text), edge.target);
  const link: GraphFixtureLink = { source: edge.source, target: edge.target, file, spec, line };

  return link;
};

/** An `explainEdge` request for a fixture link is answered with its `dependencies` entry in the dependent's `package.json`. */
export const explainCase = async (scene: GraphScene): Promise<void> => {
  const { api, root, manifest } = scene;

  await step("L13-4: explainEdge answers with the link's dependencies entry", async () => {
    const link = await fixtureLinkOf(scene);
    const pkg = manifest.packages.find((candidate): boolean => candidate.name === link.source);
    const isReplied = (): boolean => explainedFor(api, root, link.source, link.target) !== null;

    await api.graph.receive(root, { type: 'explainEdge', source: link.source, target: link.target });
    await waitFor('edge explained', isReplied);

    const reply = explainedFor(api, root, link.source, link.target);

    if (reply === null || pkg === undefined) throw new Error('no edgeExplained reply was posted');

    const { result } = reply;

    if (result.kind !== 'found') throw new Error(`the reply is ${result.kind}, not found`);

    const expected = { field: 'dependencies', key: link.target, spec: link.spec, line: link.line };

    assert.equal(result.file, `${pkg.path}/${MANIFEST_FILE}`);
    assert.ok(link.line >= 0);
    assert.deepEqual(result.entries[0], expected);
  });
};

/** An `openManifest` request opens the dependent's `package.json` with the cursor at the start of the entry's line. */
export const openManifestCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step("L13-5: openManifest opens the dependent's package.json at the entry's line", async () => {
    const link = await fixtureLinkOf(scene);
    const expectedPath = vscode.Uri.file(link.file).fsPath;
    const isAtLine = (): boolean => {
      const editor = vscode.window.activeTextEditor;

      return editor?.document.uri.fsPath === expectedPath && editor.selection.active.line === link.line;
    };

    await api.graph.receive(root, { type: 'openManifest', packageName: link.source, line: link.line });
    await waitFor('manifest at the entry line', isAtLine);

    assert.equal(vscode.window.activeTextEditor?.selection.active.character, 0);
  });
};
