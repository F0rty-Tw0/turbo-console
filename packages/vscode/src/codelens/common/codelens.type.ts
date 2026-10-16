/** One CodeLens as the pure side decides it: the line it sits on and its title. */
export type LensSpec = {
  readonly line: number;
  readonly title: string;
};
