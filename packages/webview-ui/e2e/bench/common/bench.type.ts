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

export type LongTask = {
  readonly startTime: number;
  readonly duration: number;
};

/** What the page-side recorder holds: every frame time, every long task, and the pan window marks (`null` until set). */
export type RawPanTrace = {
  readonly frames: number[];
  readonly tasks: LongTask[];
  readonly tOn: number | null;
  readonly tOff: number | null;
};

export type PanTrace = {
  readonly frameDeltasMs: number[];
  readonly longestLongTaskMs: number;
};

export type PanHook = {
  markOn(): void;
  markOff(): void;
  read(): RawPanTrace;
};

/* eslint-disable @typescript-eslint/naming-convention -- the init script sets this exact name on window */

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- only an interface merges into Window
  interface Window {
    __benchPan?: PanHook;
  }
}

/* eslint-enable @typescript-eslint/naming-convention */
