import { describe, expect, it } from 'vitest';

import { turboEnv } from './turbo-env.util.ts';

const FORCED_ENTRIES: [string, string][] = [
  ['TURBO_CACHE', 'local:rw'],
  ['TURBO_TOKEN', 'turbo-console-no-token'],
  ['TURBO_API', 'http://127.0.0.1:1'],
  ['TURBO_TELEMETRY_MESSAGE_DISABLED', '1'],
  ['GIT_CONFIG_COUNT', '1'],
  ['GIT_CONFIG_KEY_0', 'core.fsmonitor'],
  ['GIT_CONFIG_VALUE_0', 'false']
];

const KEPT_ENTRIES: [string, string][] = [
  ['PATH', '/bin'],
  ['TURBO_TELEMETRY_DISABLED', '1']
];

const envOf = (entries: [string, string][]): NodeJS.ProcessEnv => Object.fromEntries(entries);

describe('FEATURE: turbo process env', () => {
  describe('GIVEN an env with no git variables and no turbo credential or redirect variables', () => {
    it('WHEN it is hardened THEN every variable is kept and the forced ones are added', () => {
      const env = envOf(KEPT_ENTRIES);

      const hardened = turboEnv(env);

      expect(hardened).toStrictEqual(envOf([...KEPT_ENTRIES, ...FORCED_ENTRIES]));
    });
  });

  describe('GIVEN an env with inherited git variables', () => {
    it('WHEN it is hardened THEN every GIT_ variable is dropped, whatever its case', () => {
      const gitEntries: [string, string][] = [
        ['GIT_DIR', '/repo/.git'],
        ['Git_Work_Tree', '/repo'],
        ['GIT_CONFIG_COUNT', '3']
      ];
      const env = envOf([...KEPT_ENTRIES, ...gitEntries]);

      const hardened = turboEnv(env);

      expect(hardened).toStrictEqual(envOf([...KEPT_ENTRIES, ...FORCED_ENTRIES]));
    });
  });

  describe('GIVEN an env with turbo credential and redirect variables', () => {
    it('WHEN it is hardened THEN each is dropped, whatever its case, and the forced TURBO_CACHE, TURBO_TOKEN and TURBO_API replace them', () => {
      const turboEntries: [string, string][] = [
        ['TURBO_API', 'http://cache.invalid'],
        ['TURBO_BINARY_PATH', '/bin/other-turbo'],
        ['TURBO_CACHE', 'remote:rw'],
        ['TURBO_LOGIN', 'http://login.invalid'],
        ['TURBO_TEAM', 'team'],
        ['turbo_teamid', 'team_x'],
        ['TURBO_TOKEN', 'token']
      ];
      const env = envOf([...KEPT_ENTRIES, ...turboEntries]);

      const hardened = turboEnv(env);

      expect(hardened).toStrictEqual(envOf([...KEPT_ENTRIES, ...FORCED_ENTRIES]));
    });
  });

  describe('GIVEN an env with the cache-mode variables turbo rejects next to TURBO_CACHE', () => {
    it('WHEN it is hardened THEN each is dropped, whatever its case', () => {
      const cacheModeEntries: [string, string][] = [
        ['TURBO_FORCE', 'true'],
        ['turbo_remote_cache_read_only', 'true'],
        ['TURBO_REMOTE_ONLY', 'true']
      ];
      const env = envOf([...KEPT_ENTRIES, ...cacheModeEntries]);

      const hardened = turboEnv(env);

      expect(hardened).toStrictEqual(envOf([...KEPT_ENTRIES, ...FORCED_ENTRIES]));
    });
  });

  describe('GIVEN an env pointing turbo at another root turbo.json', () => {
    it('WHEN it is hardened THEN TURBO_ROOT_TURBO_JSON is dropped, whatever its case', () => {
      const rootConfigEntries: [string, string][] = [
        ['TURBO_ROOT_TURBO_JSON', '/elsewhere/turbo.json'],
        ['turbo_root_turbo_json', '/elsewhere/turbo.json']
      ];
      const env = envOf([...KEPT_ENTRIES, ...rootConfigEntries]);

      const hardened = turboEnv(env);

      expect(hardened).toStrictEqual(envOf([...KEPT_ENTRIES, ...FORCED_ENTRIES]));
    });
  });

  describe('GIVEN any env', () => {
    it('WHEN it is hardened THEN the input is not mutated', () => {
      const entries: [string, string][] = [
        ['GIT_DIR', '/repo/.git'],
        ['TURBO_TOKEN', 'token']
      ];
      const env = envOf(entries);

      turboEnv(env);

      expect(env).toStrictEqual(envOf(entries));
    });
  });
});
