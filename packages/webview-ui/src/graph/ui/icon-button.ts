import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';

/** An icon-only button: `aria-label` names it, `title` is its hover text. The caller disables or wires it. */
export const iconButton = (icon: GraphIconId, label: string, title: string): HTMLButtonElement => {
  const button = textElement('button', 'icon-button', '');
  const glyph = graphIcon(icon);

  button.type = 'button';
  button.title = title;
  button.setAttribute('aria-label', label);
  button.append(glyph);

  return button;
};
