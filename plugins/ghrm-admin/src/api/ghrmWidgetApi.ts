import { api } from '@/api';

export interface GhrmBreadcrumbConfig {
  id: string;
  separator: string;
  root_name: string;
  root_slug: string;
  show_category: boolean;
  max_label_length: number;
  css: string;
}

export const ghrmWidgetApi = {
  getWidgets(): Promise<{ widgets: GhrmBreadcrumbConfig[] }> {
    return api.get('/admin/ghrm/widgets');
  },
  updateWidget(widgetId: string, config: Partial<GhrmBreadcrumbConfig>): Promise<GhrmBreadcrumbConfig> {
    return api.put(`/admin/ghrm/widgets/${widgetId}`, config);
  },
};
