/** turbo 2.11.7 exits 2 when its `query` JSON carries GraphQL errors (validation or resolver), with the JSON on stdout. */
const QUERY_ERROR_EXIT_CODE = 2;

/** `--version` prints one version line, as `2.11.7\n`. */
const VERSION_LINE = /^\S+\r?\n$/;

const NOT_JSON = Symbol('not JSON');

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return NOT_JSON;
  }
};

const hasErrors = (json: unknown): boolean => {
  const isObject = typeof json === 'object' && json !== null;

  if (!isObject) return false;

  const errors: unknown = Reflect.get(json, 'errors');

  return Array.isArray(errors) && errors.length > 0;
};

/** True when the stdout tail ends like a JSON object; cheap, for `ExitStallCheck.isEnd`. */
export const isJsonEnd = (tail: string): boolean => tail.trimEnd().endsWith('}');

/** 0 when stdout is JSON (`run --dry=json` prints it only on success), `null` when it is not complete. */
export const jsonExitCode = (stdout: string): number | null => {
  const json = parseJson(stdout);

  return json === NOT_JSON ? null : 0;
};

/** What a stalled `turbo query` would have exited with: 2 when its JSON lists errors, else 0; `null` when stdout is not JSON. */
export const queryExitCode = (stdout: string): number | null => {
  const json = parseJson(stdout);

  if (json === NOT_JSON) return null;

  const isFailed = hasErrors(json);

  return isFailed ? QUERY_ERROR_EXIT_CODE : 0;
};

/** 0 when stdout is one whole `--version` line, `null` when it is not. */
export const versionExitCode = (stdout: string): number | null => {
  const isVersionLine = VERSION_LINE.test(stdout);

  return isVersionLine ? 0 : null;
};

/** True when the stdout tail is one whole `--version` line; the output is that short, so the tail is all of it. */
export const isVersionEnd = (tail: string): boolean => VERSION_LINE.test(tail);
