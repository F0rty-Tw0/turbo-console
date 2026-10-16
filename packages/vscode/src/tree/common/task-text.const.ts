/**
 * Must equal webview-ui's `NOT_TURBO_TASK_TEXT` (`webview-ui/src/details/common/field-text.const.ts`): the host cannot
 * import that const (the package index does not export it), and no spec can import both packages.
 */
const NOT_TURBO_TASK_TEXT = 'Not a turbo task: no turbo.json defines it';

/** The first tooltip lines of a task row, by task kind; a plain turbo task has none (spec 1c-a §4.9). */
export const CONTINUOUS_KIND_LINES: string[] = ['Continuous task: runs until stopped (persistent)'];

export const NOT_TURBO_KIND_LINES: string[] = [NOT_TURBO_TASK_TEXT, "Turbo Console can't run it yet."];
