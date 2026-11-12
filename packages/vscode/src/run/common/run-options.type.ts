import type { RunRequest } from './run.type.ts';

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

export type InputAsk = {
  readonly prompt: string;
  readonly placeholder: string;
  readonly validate: (value: string) => string | null;
};

export type RunOptionsPorts = {
  readonly pickMany: (items: OptionItem[], placeholder: string) => Promise<OptionItem[] | undefined>;
  readonly input: (ask: InputAsk) => Promise<string | undefined>;
  readonly info: (text: string) => void;
  readonly run: (request: RunRequest) => Promise<void>;
};
