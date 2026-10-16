import type { PackageNode } from '@turbo-console/core';

import type { RunRequest } from './run.type.ts';

/** One quick pick row; `value` is the raw task or package name, never the cleaned label. */
export type PickItem = {
  readonly label: string;
  readonly description: string;
  readonly root: string;
  readonly value: string;
};

/**
 * Editor effects of the pickers. `ensureLoaded` settles when a root has its first answer; `rootOf` is the path of the
 * workspace folder that holds `file` (the editor's case rules apply), `null` when none does; `pick` resolves with the item
 * chosen, or `undefined` when the pick is closed; `info` shows a message; `run` is the run flow of a request.
 */
export type PickerPorts = {
  readonly ensureLoaded: (root: string) => Promise<void>;
  readonly rootOf: (file: string) => string | null;
  readonly pick: (items: PickItem[], placeholder: string) => Promise<PickItem | undefined>;
  readonly info: (text: string) => void;
  readonly run: (request: RunRequest) => Promise<void>;
};

/** The part of `PickerPorts` that finds the package a manifest file holds; the run pickers and Package Details share it. */
export type FileLookupPorts = Pick<PickerPorts, 'ensureLoaded' | 'rootOf' | 'info'>;

/** The package a manifest file holds, with the root that holds the file. */
export type FilePackage = {
  readonly root: string;
  readonly pkg: PackageNode;
};

/** A task of a package in a root, by name: what a pick ends in. */
export type NamedTask = {
  readonly root: string;
  readonly packageName: string;
  readonly taskName: string;
};

/** The visible tasks of the package a manifest file holds, as quick pick items. */
export type FileTasks = {
  readonly packageName: string;
  readonly placeholder: string;
  readonly items: PickItem[];
};
