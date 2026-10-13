import type { TurboConfigError } from '../../common/turbo-config.type.ts';

/** A config at `path` that failed to parse. */
export const configError = (path: string): TurboConfigError => {
  const config: TurboConfigError = { path, error: 'InvalidSymbol at 3' };

  return config;
};

/** `count` parse errors under `packages/p000` … in reverse path order, so the builder must sort before it cuts. */
export const manyErrors = (count: number): TurboConfigError[] => {
  const paths = Array.from({ length: count }, (_, index) => `packages/p${String(index).padStart(3, '0')}/turbo.json`);

  return paths.toReversed().map(configError);
};
