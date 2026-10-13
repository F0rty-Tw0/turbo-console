/**
 * turbo credential, redirect, config and cache-mode variables; inherited, they would point turbo at another cache,
 * team, binary or root `turbo.json` (core reads and keys `<root>/turbo.json` only), and the deprecated cache-mode ones
 * make turbo reject the forced `TURBO_CACHE` and exit 1.
 */
const DROPPED_TURBO_KEYS = [
  'TURBO_API',
  'TURBO_BINARY_PATH',
  'TURBO_CACHE',
  'TURBO_FORCE',
  'TURBO_LOGIN',
  'TURBO_REMOTE_CACHE_READ_ONLY',
  'TURBO_REMOTE_ONLY',
  'TURBO_ROOT_TURBO_JSON',
  'TURBO_TEAM',
  'TURBO_TEAMID',
  'TURBO_TOKEN'
];

const FORCED_ENTRIES: [string, string][] = [
  // A repo turbo.json `remoteCache.apiUrl` would otherwise receive cache reads and writes.
  ['TURBO_CACHE', 'local:rw'],
  // Replaces the turbo or Vercel CLI login token turbo would otherwise send with its cache-usage events.
  ['TURBO_TOKEN', 'turbo-console-no-token'],
  // Sends those events to a closed local port instead of the repo turbo.json `remoteCache.apiUrl`.
  ['TURBO_API', 'http://127.0.0.1:1'],
  // Hides only turbo's one-time telemetry notice on stderr; the user's telemetry choice stands.
  ['TURBO_TELEMETRY_MESSAGE_DISABLED', '1'],
  // Only a repo .git/config `core.fsmonitor` command is disabled; the rest of that config, filters included, is trusted.
  ['GIT_CONFIG_COUNT', '1'],
  ['GIT_CONFIG_KEY_0', 'core.fsmonitor'],
  ['GIT_CONFIG_VALUE_0', 'false']
];

/** Windows env names are case-insensitive, so `Git_Dir` and `turbo_token` count too. */
const isInherited = ([name]: [string, string | undefined]): boolean => {
  const upperName = name.toUpperCase();
  // Every GIT_ variable is dropped on purpose, the user's own GIT_CONFIG_* entries included.
  const isGitVariable = upperName.startsWith('GIT_');
  const isDroppedTurboKey = DROPPED_TURBO_KEYS.includes(upperName);

  return !isGitVariable && !isDroppedTurboKey;
};

/**
 * The env turbo runs with: `env` minus every `GIT_*` variable (an inherited `GIT_DIR`/`GIT_WORK_TREE` points git at
 * another repo) and minus turbo's credential, redirect, config and cache-mode variables, plus `TURBO_CACHE=local:rw`, a dummy
 * `TURBO_TOKEN` and `TURBO_API` on a closed local port (no request reaches a repo's remote cache), the telemetry
 * notice hidden, and `core.fsmonitor=false` forced through `GIT_CONFIG_*`. Only fsmonitor is disabled: the target
 * repo's `.git/config` is otherwise trusted, filters included, so gating an untrusted repo is the caller's job. `env`
 * is not mutated.
 */
export const turboEnv = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const inherited = Object.entries(env).filter(isInherited);
  const hardened = Object.fromEntries([...inherited, ...FORCED_ENTRIES]);

  return hardened;
};
