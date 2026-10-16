import type { IconSpec } from './tree-row.type.ts';

export const ROOT_FOLDER_ICON: IconSpec = { id: 'root-folder', color: null };

export const FOLDER_ICON: IconSpec = { id: 'folder', color: null };

export const PACKAGE_ICON: IconSpec = { id: 'package', color: null };

/** Spec §4.7 task icons: Nx's wrench when idle, then one per run state. */
export const IDLE_ICON: IconSpec = { id: 'tools', color: null };

export const RUNNING_ICON: IconSpec = { id: 'sync~spin', color: null };

export const PASSED_ICON: IconSpec = { id: 'pass', color: 'testing.iconPassed' };

export const FAILED_ICON: IconSpec = { id: 'error', color: 'testing.iconFailed' };

export const STOPPED_ICON: IconSpec = { id: 'debug-stop', color: 'disabledForeground' };

/** Spec 1c-a §4.5 task-kind icons: below every run-state icon, above the idle wrench. */
export const CONTINUOUS_IDLE_ICON: IconSpec = { id: 'server-process', color: null };

export const CONTINUOUS_RUNNING_ICON: IconSpec = { id: 'pulse', color: null };

/** Spec §4.7 message icons, and the spinner of the §4.3 placeholder. */
export const ERROR_ICON: IconSpec = { id: 'error', color: 'errorForeground' };

export const WARNING_ICON: IconSpec = { id: 'warning', color: 'editorWarning.foreground' };

export const INFO_ICON: IconSpec = { id: 'info', color: 'editorInfo.foreground' };

export const LOADING_ICON: IconSpec = { id: 'loading~spin', color: null };

/** Spec 1c-b §4.6: the Scripts group of a package. */
export const SCRIPTS_ICON: IconSpec = { id: 'symbol-namespace', color: null };
