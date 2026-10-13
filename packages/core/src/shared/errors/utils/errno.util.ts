/** A Node errno error's `code` when it is a string; `undefined` for anything else. */
export const errnoCode = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) return undefined;

  const code: unknown = Reflect.get(error, 'code');

  return typeof code === 'string' ? code : undefined;
};

/** The path, or one of its parents, does not exist or is not a directory. */
export const isMissing = (error: unknown): boolean => {
  const code = errnoCode(error);

  return code === 'ENOENT' || code === 'ENOTDIR';
};
