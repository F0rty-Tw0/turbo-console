import { setHidden } from './widget-rows.ts';
import type { GraphBreadcrumbDeps } from '../common/graph-widgets.type.ts';
import { BREADCRUMB_MAX_LINES } from '../common/graph.const.ts';
import type { BreadcrumbElements } from '../common/widget-menu.type.ts';
import { breadcrumbLinesOf } from '../utils/breadcrumb.util.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';

/** The folder focus breadcrumb at the layer's top left: hidden without a focused folder, else its title and the links it hides. */
export class GraphBreadcrumb {
  private readonly deps: GraphBreadcrumbDeps;
  private readonly elements: BreadcrumbElements;

  public constructor(deps: GraphBreadcrumbDeps) {
    this.deps = deps;
    this.elements = deps.views.breadcrumb();
    this.elements.allFolders.addEventListener('click', (): void => deps.clearFocus());
    deps.layer.prepend(this.elements.nav);
  }

  public update(): void {
    const folder = this.deps.focusedFolder();
    const { nav, title, lines } = this.elements;

    setHidden(nav, folder === null);

    if (folder === null) return;

    const drawn = this.deps.drawn();
    const texts = breadcrumbLinesOf(folder, drawn?.infos ?? [], drawn?.edges ?? []);
    const children = texts.map((text, index) => this.deps.views.breadcrumbLine(text, index < BREADCRUMB_MAX_LINES));

    title.textContent = folderTitleOf(folder);
    lines.replaceChildren(...children);
  }
}
