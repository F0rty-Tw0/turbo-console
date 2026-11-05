import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

import {
  goFileOf,
  isLLeftAs,
  isLUnderA,
  isStarted,
  liveSceneOf,
  nodeOf,
  startedUnderA,
  withBlockedL
} from './graph-live-scene.spec.util.ts';
import { lastPostedRuns, postedRunsAfter } from './graph-posted.spec.util.ts';
import { logFilesOf } from './run-live-case.spec.util.ts';
import { endedRun, startGraphRun, startRun } from './run-wait.spec.util.ts';
import { log, step, waitFor } from './suite-env.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { ProgressRecord } from '../../src/run/common/run-progress.type.ts';
import type { GraphLiveScene, GraphScene } from '../common/graph.type.ts';

/** L13-15: A's run holds L, so the graph posts L running with owner A; once A passes, L shows passed and the log file is gone. */
export const ownerCase = async (graph: GraphScene): Promise<void> => {
  const scene = await liveSceneOf(graph);
  const { api, root, a } = scene;

  await step('L13-15: a graph run of A posts its dependency L as running under A, then passed without an owner', async () => {
    await withBlockedL(scene, async () => {
      const launchedAt = await startedUnderA(scene, 'owner');
      const mark = lastPostedRuns(api, root);
      const node = await nodeOf(scene, a);

      await writeFile(goFileOf(scene), '');

      const ended = await endedRun(api, node, launchedAt);

      await waitFor('L passed without an owner', () => isLLeftAs(scene, mark, 'passed'));
      await waitFor('log file removed', () => logFilesOf(root).length === 0);
      assert.equal(ended.state, 'passed');
    });
  });
};

/** L13-16: the page's Stop on A, whose dependency L runs under it, stops A's run and clears L's owner. */
export const ownerStopCase = async (graph: GraphScene): Promise<void> => {
  const scene = await liveSceneOf(graph);
  const { api, root, a } = scene;

  await step('L13-16: stopTask on the owner A stops its run and posts L stopped without an owner', async () => {
    await withBlockedL(scene, async () => {
      const launchedAt = await startedUnderA(scene, 'stop');
      const mark = lastPostedRuns(api, root);
      const node = await nodeOf(scene, a);

      await api.graph.receive(root, { type: 'stopTask', taskId: a.fullName });

      const ended = await endedRun(api, node, launchedAt);

      await waitFor('L stopped without an owner', () => isLLeftAs(scene, mark, 'stopped'));
      assert.equal(ended.state, 'stopped');
    });
  });
};

const isRunningUnderA = (scene: GraphLiveScene): boolean => {
  const { api, root, a, l } = scene;
  const records = api.progress.recordsOf(root, l.fullName);
  const isOwned = (record: ProgressRecord): boolean => record.owner.taskId === a.fullName && record.state === 'running';

  return records.some(isOwned);
};

/** L13-17: L's own run wins over A's record of L; once L's own run is stopped, the graph shows A as L's owner. */
export const ownWinsCase = async (graph: GraphScene): Promise<void> => {
  const scene = await liveSceneOf(graph);
  const { api, root, a, l } = scene;

  await step('L13-17: L run on its own shows no owner while A runs it too, and shows A once the own run is stopped', async () => {
    await withBlockedL(scene, async () => {
      const mark = lastPostedRuns(api, root);
      const nodeL = await nodeOf(scene, l);
      const launchedL = await startRun(api, nodeL);

      await waitFor('L process started', () => isStarted(scene, l));

      const nodeA = await nodeOf(scene, a);
      const launchedA = await startGraphRun(api, nodeA);

      await waitFor('L recorded running under A', () => isRunningUnderA(scene));
      await whenQuiet(api, root);

      const later = postedRunsAfter(api, root, mark);
      const owners = later.map((message) => message.owners?.[l.fullName]);
      const found = owners.filter((owner) => owner !== undefined);

      assert.ok(owners.length > 0, 'no runs post since the own run started');
      assert.deepEqual(found, []);

      await api.graph.receive(root, { type: 'stopTask', taskId: l.fullName });

      const endedL = await endedRun(api, nodeL, launchedL);

      assert.equal(endedL.state, 'stopped');
      assert.equal(api.runs.get(root, a.fullName)?.state, 'running');
      await waitFor('L owned by A', () => isLUnderA(scene));
      log(`own-wins: A shown as owner of L ${Date.now() - launchedA} ms after the launch of A, after the own stop of L`);
      await writeFile(goFileOf(scene), '');
      await endedRun(api, nodeA, launchedA);
    });
  });
};
