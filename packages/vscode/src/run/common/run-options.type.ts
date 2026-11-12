type SplitArgsOk = {
  readonly args: string[];
};

export type SplitArgsError = {
  readonly error: string;
};

export type SplitArgs = SplitArgsOk | SplitArgsError;
