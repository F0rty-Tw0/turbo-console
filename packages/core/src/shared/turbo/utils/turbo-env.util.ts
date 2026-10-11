/** turbo credential and redirect variables; inherited, they would point turbo at another cache, team or binary. */
const DROPPED_TURBO_KEYS = [
  'TURBO_API',
  'TURBO_BINARY_PATH',
  'TURBO_CACHE',
  'TURBO_LOGIN',
  'TURBO_TEAM',
  'TURBO_TEAMID',
  'TURBO_TOKEN'
];

const FORCED_ENTRIES: [string, string][] = [
  // A repo turbo.json `remoteCache.apiUrl` would otherwise receive the user's turbo login token.
  ['TURBO_CACHE', 'local:rw'],
  // A repo .git/config `core.fsmonitor` command would otherwise run on `turbo run`.
  ['GIT_CONFIG_COUNT', '1'],
  ['GIT_CONFIG_KEY_0', 'core.fsmonitor'],
  ['GIT_CONFIG_VALUE_0', 'false']
];

/** Windows env names are case-insensitive, so `Git_Dir` and `turbo_token` count too. */
const isInherited = ([name]: [string, string | undefined]): boolean => {
  const upperName = name.toUpperCase();
  const isGitVariable = upperName.startsWith('GIT_');
  const isDroppedTurboKey = DROPPED_TURBO_KEYS.includes(upperName);

  return !isGitVariable && !isDroppedTurboKey;
};

/**
 * The env turbo runs with: `env` minus every `GIT_*` variable (an inherited `GIT_DIR`/`GIT_WORK_TREE` points git at
 * another repo) and minus turbo's credential and redirect variables, plus `TURBO_CACHE=local:rw` and
 * `core.fsmonitor=false` forced through `GIT_CONFIG_*`. `env` is not mutated.
 */
export const turboEnv = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const inherited = Object.entries(env).filter(isInherited);
  const hardened = Object.fromEntries([...inherited, ...FORCED_ENTRIES]);

  return hardened;
};
