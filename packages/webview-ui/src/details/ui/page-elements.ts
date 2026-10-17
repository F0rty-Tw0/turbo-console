import { safeIconId } from '../utils/run-view.util.ts';

type Listener = () => void;

/** An element whose text is set through `textContent`, the only way repo text reaches the page (spec 1b D3). */
export const textElement = <TTag extends keyof HTMLElementTagNameMap>(
  tag: TTag,
  className: string,
  text: string
): HTMLElementTagNameMap[TTag] => {
  const element = document.createElement(tag);

  element.className = className;
  element.textContent = text;

  return element;
};

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

export const textButton = (label: string, onClick: Listener): HTMLButtonElement => {
  const button = textElement('button', 'text-button', label);

  button.type = 'button';
  button.addEventListener('click', onClick);

  return button;
};
