import type { FolderRowElements, RowKind, WidgetViews } from '../../common/widget.type.ts';
import { widgetViews } from '../../ui/graph-views.ts';
import type { WidgetRowViewsMock } from '../common/widget-row-views.type.ts';

/** The page's widget views with `row` recording what it builds, so a spec reaches each row's buttons. */
export const widgetRowViewsMock = (): WidgetRowViewsMock => {
  const built: FolderRowElements[] = [];
  const row = (kind: RowKind, title: string, count: number): FolderRowElements => {
    const elements = widgetViews.row(kind, title, count);

    built.push(elements);

    return elements;
  };
  const views: WidgetViews = { ...widgetViews, row };
  const mock: WidgetRowViewsMock = { views, built };

  return mock;
};
