/**
 * Catalog store for the Settings → Custom Fields page (S77).
 *
 * Backs the two tabs: the custom-field-def catalog and the global-tag catalog.
 * Filtering / quick-search are applied server-side where the API supports it
 * (def `entity_type` + `type`, tag `parent_entity_type`) and client-side for
 * the free-text quick-search. The tag list endpoint already carries a `stats`
 * usage count per row (one grouped query — never N+1).
 */
import { defineStore } from 'pinia';
import { api } from '../api';

export interface CustomFieldDefRow {
  id: string;
  entity_type: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  sort_order: number;
  is_active: boolean;
}

export interface TagRow {
  id: string;
  slug: string;
  name: string;
  parent_entity_type: string | null;
  meta_data: Record<string, unknown>;
  color: string | null;
  stats: number;
}

export interface EntityTypeRow {
  entity_type: string;
  label: string;
  manage_permission: string;
}

export const useTagsCustomFieldsStore = defineStore('tagsCustomFields', {
  state: () => ({
    customFields: [] as CustomFieldDefRow[],
    tags: [] as TagRow[],
    entityTypes: [] as EntityTypeRow[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchEntityTypes(): Promise<void> {
      const response = await api.get<{ entity_types: EntityTypeRow[] }>(
        '/admin/custom-field-entity-types',
      );
      this.entityTypes = response.entity_types ?? [];
    },

    async fetchCustomFields(filters: { entityType?: string; type?: string } = {}): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const params = new URLSearchParams();
        if (filters.entityType) params.set('entity_type', filters.entityType);
        if (filters.type) params.set('type', filters.type);
        const query = params.toString();
        const response = await api.get<{ custom_fields: CustomFieldDefRow[] }>(
          `/admin/custom-fields${query ? `?${query}` : ''}`,
        );
        this.customFields = response.custom_fields ?? [];
      } catch (caught) {
        this.error = caught instanceof Error ? caught.message : String(caught);
      } finally {
        this.loading = false;
      }
    },

    async fetchTags(filters: { parentEntityType?: string } = {}): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const params = new URLSearchParams();
        if (filters.parentEntityType) params.set('parent_entity_type', filters.parentEntityType);
        const query = params.toString();
        const response = await api.get<{ tags: TagRow[] }>(
          `/admin/tags${query ? `?${query}` : ''}`,
        );
        this.tags = response.tags ?? [];
      } catch (caught) {
        this.error = caught instanceof Error ? caught.message : String(caught);
      } finally {
        this.loading = false;
      }
    },

    async createCustomField(payload: Partial<CustomFieldDefRow>): Promise<void> {
      await api.post('/admin/custom-fields', payload);
    },

    async createTag(payload: Partial<TagRow>): Promise<void> {
      await api.post('/admin/tags', payload);
    },

    async bulkDeleteCustomFields(ids: string[]): Promise<void> {
      await api.post('/admin/custom-fields/bulk-delete', { ids });
    },

    async bulkDeleteTags(slugs: string[]): Promise<void> {
      await api.post('/admin/tags/bulk-delete', { slugs });
    },

    async setCustomFieldActive(id: string, isActive: boolean): Promise<void> {
      await api.put(`/admin/custom-fields/${id}`, { is_active: isActive });
    },
  },
});
