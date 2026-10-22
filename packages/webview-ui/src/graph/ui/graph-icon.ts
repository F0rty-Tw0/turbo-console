import type { GraphIconId } from '../common/graph-icon.type.ts';

/** A decorative Codicon; the text beside it carries the meaning, so screen readers skip it. */
export const graphIcon = (id: GraphIconId): HTMLSpanElement => {
  const icon = document.createElement('span');

  icon.classList.add('codicon', `codicon-${id}`);
  icon.setAttribute('aria-hidden', 'true');

  return icon;
};
