/** The chip a continuous card carries. */
export const CONTINUOUS_CHIP = 'Continuous · runs until stopped';

/** The inline colour of a running card's status icon: the page's own running variable, since the host sends none. */
export const RUNNING_ICON_COLOR = 'var(--vscode-progressBar-background)';

/** A turbo card's facts, in order. */
export const FULL_TERMS: string[] = ['Cache', 'Inputs', 'Outputs', 'Depends on', 'Env', 'Dependents'];

/** A script card's facts, in order. */
export const SCRIPT_TERMS: string[] = ['Script', 'Dependents'];
