import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { lastGraphState } from './graph-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import { ROOT_PACKAGE_NAME, ROOT_TASK_ID } from '../common/graph.const.ts';
import type { GraphScene } from '../common/graph.type.ts';

type Flags = [scopeShown: boolean, scriptsShown: boolean];

/** The two flags of the newest graph state, `null` before there is one. */
const flagsOf = (scene: GraphScene): Flags | null => {
  const state = lastGraphState(scene.api, scene.root);

  if (state === null) return null;

  const flags: Flags = [state.scopeShown, state.scriptsShown];

  return flags;
};

const isScopeShown = (scene: GraphScene): boolean => flagsOf(scene)?.[0] === true;

const isScriptsShown = (scene: GraphScene): boolean => flagsOf(scene)?.[1] === true;

const areBothHidden = (scene: GraphScene): boolean => flagsOf(scene)?.every((flag): boolean => !flag) === true;

/** The root task `//#rootgen` is listed as a turbo task of the `//` package that Run refuses, and `//` is no graph package. */
export const rootTaskCase = async (scene: GraphScene): Promise<void> => {
  await step('L13-12: the root task is listed as a // task, turbo, not runnable, and // is not a graph package', () => {
    const state = lastGraphState(scene.api, scene.root);
    const task = state?.tasks.find(({ id }): boolean => id === ROOT_TASK_ID);

    assert.deepEqual([task?.packageName, task?.isTurboTask, task?.isRunnable], [ROOT_PACKAGE_NAME, true, false]);
    assert.ok(state?.packages.every(({ name }): boolean => name !== ROOT_PACKAGE_NAME));
  });
};

/** The tree commands change one flag each on the open graph and never relayout (tree to graph, `extension.ts` hand-off). */
export const treeToggleCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step('L13-13: the tree commands change scopeShown and scriptsShown on the open graph, each alone', async () => {
    assert.deepEqual(flagsOf(scene), [false, false]);

    const hash = lastGraphState(api, root)?.hash;

    await vscode.commands.executeCommand('turboConsole.showScope');
    await waitFor('scopeShown true', () => isScopeShown(scene));
    assert.deepEqual(flagsOf(scene), [true, false]);

    await vscode.commands.executeCommand('turboConsole.showScripts');
    await waitFor('scriptsShown true', () => isScriptsShown(scene));
    assert.deepEqual(flagsOf(scene), [true, true]);

    await vscode.commands.executeCommand('turboConsole.hideScope');
    await vscode.commands.executeCommand('turboConsole.hideScripts');
    await waitFor('both hidden', () => areBothHidden(scene));
    assert.equal(lastGraphState(api, root)?.hash, hash);
  });
};

/** A page `setViewToggle` flips the shared toggle: the graph posts again and the tree follows (page to host to tree). */
export const pageToggleCase = async (scene: GraphScene): Promise<void> => {
  const { api, root } = scene;

  await step('L13-14: a page setViewToggle flips the shared toggle, the graph re-posts and the tree follows', async () => {
    await api.graph.receive(root, { type: 'setViewToggle', toggle: 'scripts', shown: true });
    await waitFor('scriptsShown true', () => isScriptsShown(scene));
    assert.equal(api.tree.isScriptsShown(), true);
    assert.equal(api.tree.isScopeShown(), false);

    await api.graph.receive(root, { type: 'setViewToggle', toggle: 'scripts', shown: false });
    await waitFor('scriptsShown false', () => flagsOf(scene)?.[1] === false);
  });
};
