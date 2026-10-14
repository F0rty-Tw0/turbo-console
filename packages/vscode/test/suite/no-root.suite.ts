import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { EXTENSION_ID } from '../common/launch.const.ts';
import { countTurboSpawns } from '../utils/spawn-counter.spec.util.ts';
import { markDone, sleep, step } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

const STARTUP_WAIT_MS = 3000;

/**
 * L3: an empty folder, `turboPath` unset. The context key cannot be read through the API, but the extension's own
 * `activate()` is the only code that sets it, so "not active" stands for "context key unset".
 */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const counter = countTurboSpawns(env.turboPath);

  try {
    await step('5: no turbo.json, no activation and no turbo spawn', async () => {
      await sleep(STARTUP_WAIT_MS);

      const extension = vscode.extensions.getExtension(EXTENSION_ID);

      assert.ok(extension !== undefined, `${EXTENSION_ID} is not installed`);
      assert.equal(extension.isActive, false);
      assert.equal(counter.count(), 0);
    });
    await markDone(env);
  } finally {
    counter.dispose();
  }
};
