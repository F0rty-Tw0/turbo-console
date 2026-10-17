/** A codicon id: lowercase words joined by `-`, so it is one safe class token. */
export const ICON_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The prefix of the extension's tool icon ids; keeps them clear of other extensions'. */
export const TOOL_ICON_PREFIX = 'turbo-console-';

/** A VS Code theme color variable, so it is one safe `var()` argument. */
export const COLOR_VAR_PATTERN = /^--vscode-[A-Za-z0-9-]+$/;

/** The Stop button's codicon id; `patchRun` looks for it to spot a Stop→Run swap. */
export const STOP_ICON_ID = 'debug-stop';

/** Past a double-click's gap (about 300–500 ms), so its second click never lands on the Run or Stop swapped in. */
export const RUN_SWAP_HOLD_MS = 500;
