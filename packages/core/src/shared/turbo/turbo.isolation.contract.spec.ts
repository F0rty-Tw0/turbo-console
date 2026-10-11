import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PACKAGE_GRAPH_QUERY } from './common/turbo-query.const.ts';
import { queryTurbo } from './data-access/query-turbo.ts';
import { runTurbo } from './data-access/run-turbo.ts';
import { fixtureHook } from './test/utils/fixture-hook.spec.util.ts';

const TARGET_LIKE = PRESETS['target-like'];

/** turbo reads `<dir>/turborepo/config.json` from here before the platform config dir, on every OS. */
const CONFIG_DIR_VARIABLE = 'TURBO_CONFIG_DIR_PATH';

const LOGIN_CONFIG = JSON.stringify({ token: 'fake-token' });

describe('FEATURE: turbo isolation from a remote cache the repo configures', () => {
  describe('GIVEN a logged-in turbo and a target-like fixture whose turbo.json points remoteCache at a local server', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    const requests: string[] = [];

    const recordRequest = (request: IncomingMessage, response: ServerResponse): void => {
      requests.push(`${request.method ?? ''} ${request.url ?? ''}`);
      response.statusCode = 404;
      response.end();
    };

    const server = createServer(recordRequest);
    let configDir = '';

    beforeAll(async () => {
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');

      const address = server.address();

      if (address === null || typeof address === 'string') throw new Error('server has no TCP address');

      const remoteCache = JSON.stringify({ apiUrl: `http://127.0.0.1:${address.port}`, teamId: 'team_x' });
      const turboJsonFile = join(fixture().dir, 'turbo.json');
      const turboJson = await readFile(turboJsonFile, 'utf8');

      await writeFile(turboJsonFile, turboJson.replace('{', `{"remoteCache": ${remoteCache},`));
      configDir = await mkdtemp(join(tmpdir(), 'turbo-console-config-'));
      await mkdir(join(configDir, 'turborepo'));
      await writeFile(join(configDir, 'turborepo', 'config.json'), LOGIN_CONFIG);
      vi.stubEnv(CONFIG_DIR_VARIABLE, configDir);
    });

    beforeEach(() => {
      requests.splice(0);
    });

    afterAll(async () => {
      vi.unstubAllEnvs();
      server.closeAllConnections();
      server.close();
      await once(server, 'close');
      await rm(configDir, { recursive: true, force: true, maxRetries: 5 });
    });

    it('WHEN its package graph is queried THEN the server receives no request', async () => {
      const result = await queryTurbo(PACKAGE_GRAPH_QUERY, fixture().dir);

      expect(result.exitCode).toBe(0);
      expect(requests).toStrictEqual([]);
    });

    it('WHEN build runs dry THEN the server receives no request', async () => {
      const result = await runTurbo(['run', 'build', '--dry=json'], fixture().dir);

      expect(result.exitCode).toBe(0);
      expect(requests).toStrictEqual([]);
    });
  });
});
