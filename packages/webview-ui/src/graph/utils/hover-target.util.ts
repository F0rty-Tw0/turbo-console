/** The task the canvas lights up: the hovered one while the pointer is on a task, else the selected one. */
export const highlightTargetOf = (selected: string | null, hovered: string | null): string | null => hovered ?? selected;
