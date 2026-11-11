import { README_FILE, SOURCE_FILE } from '../common/affected.const.ts';
import type { AffectedEdit, AffectedScene } from '../common/affected.type.ts';

/** The edits the launch starts with: the README commit and the uncommitted leaf source edit. */
export const baseEditsOf = (scene: AffectedScene): AffectedEdit[] => {
  const { readme, leaf } = scene.edits;
  const readmeEdit: AffectedEdit = { packageName: readme.name, file: README_FILE };
  const leafEdit: AffectedEdit = { packageName: leaf.name, file: SOURCE_FILE };

  return [readmeEdit, leafEdit];
};

/** The base edits and the source edit A5 adds in the atom test package's first dependency. */
export const allEditsOf = (scene: AffectedScene): AffectedEdit[] => {
  const atomEdit: AffectedEdit = { packageName: scene.edits.atomDependency.name, file: SOURCE_FILE };

  const base = baseEditsOf(scene);

  return [...base, atomEdit];
};
