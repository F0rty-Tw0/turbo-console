import type { Mock } from 'vitest';

/** What the spec's `vscode` stand-in needs of a `vscode.Uri`. */
export type UriFake = {
  readonly fsPath: string;
};

export type WebviewUriFake = {
  readonly toString: () => string;
};

/** The parts of a `vscode.WebviewPanel` that `details-ports.ts` uses; `assigned` is every html it was given, in order. */
export type PanelFake = {
  readonly title: string;
  readonly visible: boolean;
  readonly assigned: string[];
  readonly webview: WebviewFake;
  readonly reveal: Mock<() => void>;
  readonly dispose: Mock<() => void>;
  readonly onDidChangeViewState: Mock<(listener: () => void) => void>;
  readonly onDidDispose: Mock<(listener: () => void) => void>;
};

export type WebviewFake = {
  readonly html: string;
  readonly cspSource: string;
  readonly asWebviewUri: Mock<(uri: UriFake) => WebviewUriFake>;
  readonly postMessage: Mock<(message: unknown) => Promise<boolean>>;
  readonly onDidReceiveMessage: Mock<(listener: (value: unknown) => void) => void>;
};

/** A `PanelFake` and the switch that changes its `visible`. */
export type PanelFakes = {
  readonly fake: PanelFake;
  readonly show: (visible: boolean) => void;
};
