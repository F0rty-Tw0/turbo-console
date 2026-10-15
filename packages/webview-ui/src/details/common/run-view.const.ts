/** A codicon id: lowercase words joined by `-`, so it is one safe class token. */
export const ICON_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A VS Code theme color variable, so it is one safe `var()` argument. */
export const COLOR_VAR_PATTERN = /^--vscode-[A-Za-z0-9.-]+$/;
