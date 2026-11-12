import type { TurboBinary } from '@turbo-console/core';

/** The workspace turbo 2.11.7 of root `/ws`, found at `path`. */
export const turboBinaryAt = (path: string): TurboBinary => {
  const fields = { root: '/ws', path, version: '2.11.7', source: 'workspace' };
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- core exports TurboBinary type-only and its #brand makes a literal unassignable; no production path builds one in a spec.
  const binary = fields as TurboBinary;

  return binary;
};
