/** One letter per state of each paint part: n normal, s selected, h highlighted, d dimmed. */
export type Letters = {
  readonly nodes: string;
  readonly links: string;
  readonly boxes: string;
  readonly collapsedNodes: string;
  readonly folderLinks: string;
};
