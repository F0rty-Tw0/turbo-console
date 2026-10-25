import assert from 'node:assert/strict';

import { assertTerminalKept } from './run-terminal.spec.util.ts';
import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { step } from './suite-env.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { ROOT_BUILD_ID, ROOT_PACKAGE } from '../common/single-package.const.ts';

/**
 * L11-2 (spec §2.2, §4.5): running `//#build` from its row passes, the run is matched to its summary (`endedRun` reads it
 * through core, which gives a single-package summary's bare `build` the id `//#build`), and the terminal keeps the
 * `//#build` name. A first pnpm run may rewrite `pnpm-lock.yaml`, which costs one reload, so the case ends quiet.
 */
export const runCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L11-2: running //#build passes, matches its summary and keeps its terminal', async () => {
    const node = await taskNodeNamed(api, ROOT_PACKAGE, ROOT_BUILD_ID);
    const launchedAt = await startRun(api, node);
    const ended = await endedRun(api, node, launchedAt);
    const { match } = ended;

    assert.equal(ended.state, 'passed');

    if (match === null) throw new Error(`the run of ${ROOT_BUILD_ID} matched no summary`);

    const isCacheKnown = match.cache === 'MISS' || match.cache === 'HIT';

    assert.ok(Number.isFinite(match.durationMs));
    assert.ok(match.durationMs >= 0);
    assert.ok(isCacheKnown, `cache status ${String(match.cache)}`);
    await assertTerminalKept(ROOT_BUILD_ID);
    await whenQuiet(api, root);
  });
};
