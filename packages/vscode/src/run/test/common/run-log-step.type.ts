/** What a row asserts on after a step: the sources of the entries it returned and the cursor it left. */
export type RunLogSummary = {
  readonly sources: string[];
  readonly offset: number;
  readonly skipping: boolean;
  readonly leadingInvalid: number;
  readonly isUnknown: boolean;
};

export type RunLogProbe = Pick<RunLogSummary, 'leadingInvalid' | 'isUnknown'>;

export type RunLogProbeRow = {
  readonly name: string;
  readonly windows: string[];
  readonly leadingInvalid: number;
  readonly isUnknown: boolean;
};
