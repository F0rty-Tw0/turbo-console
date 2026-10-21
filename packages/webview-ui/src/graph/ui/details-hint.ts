/* eslint-disable local/no-unused-exports -- first imported by Task 3.4 */
import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import { ESC_KEY_TEXT, HINT_CANCEL_TEXT } from '../common/details.const.ts';
import { hintTextOf } from '../utils/details-text.util.ts';

const hintIcon = (isNudged: boolean): HTMLElement => {
  if (!isNudged) return graphIcon('git-commit');

  const icon = graphIcon('info');

  icon.classList.add('icon-info');

  return icon;
};

/**
 * The canvas hint while picking a trace end: what to pick, then `Esc` cancels. Neither focusable nor live; the
 * spaces between the parts are text nodes so its text reads as a sentence, and the flex layout drops them.
 */
export const hintView = (start: string, isNudged: boolean): HTMLElement => {
  const hint = textElement('p', 'graph-hint', '');
  const icon = hintIcon(isNudged);
  const hintText = hintTextOf(start, isNudged);
  const text = textElement('span', '', hintText);
  const key = textElement('kbd', '', ESC_KEY_TEXT);
  const cancels = textElement('span', '', HINT_CANCEL_TEXT);

  hint.append(icon, text, ' ', key, ' ', cancels);

  return hint;
};
