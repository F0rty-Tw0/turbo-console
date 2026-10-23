export type BenchSample = {
  readonly name: string;
  readonly ms: number;
  readonly gate: boolean;
};

export type BenchRow = {
  readonly name: string;
  readonly medianNs: number;
  readonly samples: number;
  readonly gate: boolean;
};

export type Annotation = {
  readonly type: string;
  readonly description?: string | undefined;
};
