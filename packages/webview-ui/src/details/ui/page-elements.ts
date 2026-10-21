import { textElement } from '../../shared/ui/text-element.ts';
import { safeIconId } from '../utils/run-view.util.ts';

type Listener = () => void;

/** `iconId` comes from a literal here, the host's fixed run-view table, or a `ToolView.iconId` that passed `safeToolIconId`; one that is not a codicon id adds no class. */
export const codicon = (iconId: string): HTMLSpanElement => {
  const icon = document.createElement('span');
  const safeId = safeIconId(iconId);

  icon.classList.add('codicon');

  if (safeId !== null) icon.classList.add(`codicon-${safeId}`);

  icon.setAttribute('aria-hidden', 'true');

  return icon;
};

export const iconButton = (iconId: string, label: string, onClick: Listener): HTMLButtonElement => {
  const button = document.createElement('button');
  const icon = codicon(iconId);

  button.type = 'button';
  button.className = 'icon-button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.append(icon);
  button.addEventListener('click', onClick);

  return button;
};

/** The Run/Stop button: a text button holding the icon, then the visible text; `label` is its accessible name and tooltip. */
export const runButton = (iconId: string, text: string, label: string, onClick: Listener): HTMLButtonElement => {
  const button = iconButton(iconId, label, onClick);
  const caption = textElement('span', '', text);

  button.className = 'text-button run-button';
  button.append(caption);

  return button;
};

export const textButton = (label: string, onClick: Listener): HTMLButtonElement => {
  const button = textElement('button', 'text-button', label);

  button.type = 'button';
  button.addEventListener('click', onClick);

  return button;
};
