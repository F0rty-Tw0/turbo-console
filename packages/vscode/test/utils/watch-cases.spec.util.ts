import assert from 'node:assert/strict';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { firstPackageWith, packageDirOf, setScript, writeEdited } from './package-edit.spec.util.ts';
import { loadsOf, log, step } from './suite-env.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import { whenLoadedAfter, whenQuiet } from './watch-wait.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { ShownManifest, SpawnCounter } from '../common/launch.type.ts';

const BUILD_TASK = 'build';

/** Single-spaced and short, so cleaning the tooltip line leaves it unchanged. */
const BUILD_SCRIPT = 'node -e 1';

const README_LINE = '<!-- edited by the integration suite -->\n';

const DESCRIPTION = 'edited by the integration suite';

type WatchScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly name: string;
  readonly readme: string;
  readonly manifest: string;
  readonly manifestText: string;
};

/** A backslash before a newline: the markdown hard break `tooltipMarkdownOf` joins lines with. */
const MARKDOWN_LINE_BREAK = '\\\n';

/** A backslash before ASCII punctuation: the escape `tooltipMarkdownOf` puts before every such character. */
const MARKDOWN_ESCAPE = /\\([!-/:-@[-`{-~])/gu;

const unescapedOf = (line: string): string => line.replace(MARKDOWN_ESCAPE, '$1');

/** The lines of the markdown tooltip of task `taskId` under package `node`, unescaped. */
const taskTooltipLines = async (api: TurboConsoleApi, node: TreeNode, taskId: string): Promise<string[]> => {
  const children = await api.tree.getChildren(node);
  const task = children.find((child) => child.key === taskId);

  if (task === undefined) throw new Error(`${node.key} shows no task ${taskId}`);

  const { tooltip } = api.tree.getTreeItem(task);

  if (tooltip === undefined || typeof tooltip === 'string') throw new Error(`the tooltip of ${taskId} is not markdown`);

  const lines = tooltip.value.split(MARKDOWN_LINE_BREAK);

  return lines.map(unescapedOf);
};

/**
 * The README save gets a 1 s window only, so a late event from it could pass its own check; the `package.json` save
 * after it counts every load since the README save, so such a late load shows there as a second one.
 */
const savesCase = async (scene: WatchScene, counter: SpawnCounter): Promise<void> => {
  const records = loadsOf(scene.api, scene.root);
  const before = records.length;

  await step('7-saves: a README save spawns nothing', async () => {
    await appendFile(scene.readme, README_LINE);
    await whenQuiet(scene.api, scene.root);
    log(`README save: ${counter.count()} spawns`);
    assert.equal(counter.count(), 0);
  });
  await step('7-saves: a package.json save spawns once, the README save still none', async () => {
    await writeEdited(scene.manifest, scene.manifestText, (manifest) => {
      manifest['description'] = DESCRIPTION;
    });

    const loads = await whenLoadedAfter(scene.api, scene.root, before);

    log(`package.json save: ${counter.count()} spawns`);
    assert.equal(loads, 1, 'loads since the README save');
    assert.equal(counter.count(), 1);
  });
};

const scriptCase = async (scene: WatchScene): Promise<void> => {
  await step('4: a build script edit refreshes only its package', async () => {
    const node = await packageNodeNamed(scene.api, scene.name);
    const records = loadsOf(scene.api, scene.root);
    const before = records.length;
    const fired: (TreeNode | undefined)[] = [];
    const listening = scene.api.tree.onDidChangeTreeData((changed) => {
      fired.push(changed);
    });

    try {
      await writeEdited(scene.manifest, scene.manifestText, (manifest) => {
        setScript(manifest, BUILD_TASK, BUILD_SCRIPT);
      });
      await whenLoadedAfter(scene.api, scene.root, before);
    } finally {
      listening.dispose();
    }

    const firedIds = fired.map((changed) => changed?.id ?? 'undefined');
    const lines = await taskTooltipLines(scene.api, node, `${scene.name}#${BUILD_TASK}`);

    log(`script edit: ${fired.length} tree events (${firedIds.join(', ')})`);

    assert.deepEqual(firedIds, [node.id]);
    assert.equal(fired[0], node, 'the event carries the cached package node');
    assert.ok(lines.includes(`Command: ${BUILD_SCRIPT}`), `tooltip: ${lines.join(' | ')}`);
  });
};

/**
 * Spec §5.3 cases 7 (saves) and 4 on the first package with a `build` task: a README save spawns 0, a `package.json`
 * save 1, a `build` script edit fires one tree change for the cached package node. Resets the counter first (case 9's
 * query spawn counted); puts both files back before it returns.
 */
export const watchCases = async (api: TurboConsoleApi, root: string, counter: SpawnCounter, shown: ShownManifest): Promise<void> => {
  const name = firstPackageWith(shown, BUILD_TASK);
  const dir = await packageDirOf(root, name);
  const readme = join(dir, 'README.md');
  const manifest = join(dir, 'package.json');
  const readmeText = await readFile(readme, 'utf8');
  const manifestText = await readFile(manifest, 'utf8');
  const scene: WatchScene = { api, root, name, readme, manifest, manifestText };

  counter.reset();

  try {
    await savesCase(scene, counter);
    await scriptCase(scene);
  } finally {
    await writeFile(readme, readmeText);
    await writeFile(manifest, manifestText);
    await whenQuiet(api, root);
  }
};
