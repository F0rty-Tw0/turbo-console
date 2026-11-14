const SCOPED_NAME = /^@[^/]+\/(.+)$/u;

/** The name after `@scope/`, or `null` for a name with no scope (`@a/` and `@x` have none). */
export const restOf = (name: string): string | null => {
  const match = SCOPED_NAME.exec(name);

  return match?.[1] ?? null;
};
