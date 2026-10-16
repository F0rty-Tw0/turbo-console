import type * as vscode from 'vscode';

/** One package row as the tree hands it to VS Code: its id, the package's full name, its label and the tooltip's first line. */
export type PackageRowFacts = {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly tooltipName: string;
};

/** The `onDidChangeTreeData` events that redrew one node, counted since `countRedraws` ran. */
export type Redraws = {
  readonly count: () => number;
  readonly dispose: () => void;
};

/** The process starts of the task named `taskName` and the args of the last one, as VS Code started it. */
export type StartedArgs = {
  readonly starts: () => number;
  readonly args: () => string[];
  readonly dispose: () => void;
};

/**
 * What one run cost: `starts` is the turbo processes VS Code started for its task, `spawns` the turbo processes the
 * extension host itself spawned (a query or a dry run; the task's own process starts in VS Code's terminal, outside the host).
 */
export type RunCost = {
  readonly starts: number;
  readonly spawns: number;
};

/** A continuous run whose process has started, and the terminal that shows it. */
export type LiveRun = {
  readonly launchedAt: number;
  readonly terminal: vscode.Terminal;
};
