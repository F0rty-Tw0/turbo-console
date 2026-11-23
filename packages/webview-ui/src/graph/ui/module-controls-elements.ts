import { checkField, checkbox, controlsSection, depthInput, hintedField } from './controls-fields.ts';
import { textButton } from './icon-button.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import { CLEAR_FOCUS_LABEL } from '../common/details.const.ts';
import {
  MODULES_RESET_LABEL,
  MODULE_CONTROLS_ID,
  MODULE_DEPTH_HINT_ID,
  MODULE_FOCUS_SECTION_TITLE,
  MODULE_LAZIES_LABEL,
  MODULE_NO_FOCUS_TEXT,
  MODULE_TESTS_LABEL,
  MODULE_TYPES_LABEL
} from '../common/graph-module.const.ts';
import { DEPTH_HINT, DEPTH_LABEL, VIEW_SECTION_TITLE } from '../common/graph.const.ts';
import type { ModuleControlsElements } from '../common/module-controls.type.ts';

/**
 * The module Controls panel `aside#graph-module-controls`, hidden and unwired (spec §6.2): the Focus section (the target
 * line, then Clear focus, hidden until a focus is set), then the View section (Focus depth, the three kind boxes, Reset
 * view). The boxes and the depth read the view only once the panel is entered.
 */
export const buildModuleControls = (): ModuleControlsElements => {
  const target = textElement('p', 'controls-focus-target', MODULE_NO_FOCUS_TEXT);
  const clearFocus = textButton(CLEAR_FOCUS_LABEL);
  const depth = depthInput();
  const types = checkbox('controls-check');
  const tests = checkbox('controls-check');
  const lazies = checkbox('controls-check');
  const reset = textButton(MODULES_RESET_LABEL);
  const depthField = hintedField(DEPTH_LABEL, depth, DEPTH_HINT, MODULE_DEPTH_HINT_ID);
  const boxFields = [
    checkField(MODULE_TYPES_LABEL, types),
    checkField(MODULE_TESTS_LABEL, tests),
    checkField(MODULE_LAZIES_LABEL, lazies)
  ];
  const focusSection = controlsSection(MODULE_FOCUS_SECTION_TITLE, target, clearFocus);
  const viewSection = controlsSection(VIEW_SECTION_TITLE, depthField, ...boxFields, reset);
  const panel = textElement('aside', 'graph-controls graph-module-controls', '');

  clearFocus.hidden = true;
  panel.id = MODULE_CONTROLS_ID;
  panel.hidden = true;
  panel.append(focusSection, viewSection);

  const elements: ModuleControlsElements = { panel, target, clearFocus, depth, types, tests, lazies, reset };

  return elements;
};
