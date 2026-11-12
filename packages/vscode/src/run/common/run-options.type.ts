type SplitArgsOk = {
  readonly args: string[];
};

export type SplitArgsError = {
  readonly error: string;
};

export type SplitArgs = SplitArgsOk | SplitArgsError;

export type RunOption = 'force' | 'only' | 'continue' | 'concurrency' | 'passThrough';

export type OptionItem = {
  readonly label: string;
  readonly description: string;
  readonly option: RunOption;
};

export type RunPicks = {
  readonly options: RunOption[];
  readonly concurrency: string | null;
  readonly args: string[];
};
