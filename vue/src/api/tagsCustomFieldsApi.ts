/**
 * Tags & custom-fields API adapter (S77).
 *
 * Wraps the shared `ApiClient` for the generic per-entity value endpoints and
 * the catalog reads the reusable editors need. The editors are entity-agnostic:
 * each host passes only its `entityType`; the components fetch applicable tags /
 * field defs and GET/PUT the entity's values. No new backend route is added —
 * the editors reuse the existing admin catalog endpoints (no overengineering).
 */
import { api } from '@/api';
import type { CustomFieldDef, TagChip } from 'vbwd-view-component';

export interface CatalogTag extends TagChip {
  parent_entity_type: string | null;
}

/** All catalog tags (small, hot, cached server-side). */
export async function fetchCatalogTags(): Promise<CatalogTag[]> {
  const response = await api.get<{ tags: CatalogTag[] }>('/admin/tags');
  return response.tags ?? [];
}

/**
 * Tags applicable to one entity type: global (parent_entity_type === null) plus
 * tags scoped to this type. The catalog is small, so the filtering happens
 * client-side (D6) — no dedicated backend route.
 */
export async function fetchApplicableTags(entityType: string): Promise<CatalogTag[]> {
  const tags = await fetchCatalogTags();
  return tags.filter(
    (tag) => tag.parent_entity_type === null || tag.parent_entity_type === entityType,
  );
}

/** Active field definitions for one entity type, ordered for display. */
export async function fetchFieldDefs(entityType: string): Promise<CustomFieldDef[]> {
  const response = await api.get<{ custom_fields: CustomFieldDef[] }>(
    `/admin/custom-fields?entity_type=${encodeURIComponent(entityType)}`,
  );
  return (response.custom_fields ?? []).sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
  );
}

/**
 * Create a catalog tag scoped to one entity type and return it. Used by the
 * inline "create tag" affordance in the tag picker. The slug is derived from the
 * name; the backend also auto-creates unknown slugs on PUT, so this is a
 * best-effort upgrade that gives the new tag a proper name + entity scope.
 */
export async function createTag(
  name: string,
  parentEntityType: string | null,
): Promise<CatalogTag> {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const response = await api.post<{ tag: CatalogTag }>('/admin/tags', {
    slug,
    name: name.trim(),
    parent_entity_type: parentEntityType,
  });
  return response.tag;
}

export async function fetchEntityTags(
  entityType: string,
  entityId: string,
): Promise<string[]> {
  const response = await api.get<{ tags: string[] }>(
    `/admin/${entityType}/${entityId}/tags`,
  );
  return response.tags ?? [];
}

export async function saveEntityTags(
  entityType: string,
  entityId: string,
  tags: string[],
): Promise<string[]> {
  const response = await api.put<{ tags: string[] }>(
    `/admin/${entityType}/${entityId}/tags`,
    { tags },
  );
  return response.tags ?? [];
}

export async function fetchEntityCustomFields(
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown>> {
  const response = await api.get<{ custom_fields: Record<string, unknown> }>(
    `/admin/${entityType}/${entityId}/custom-fields`,
  );
  return response.custom_fields ?? {};
}

export async function saveEntityCustomFields(
  entityType: string,
  entityId: string,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await api.put<{ custom_fields: Record<string, unknown> }>(
    `/admin/${entityType}/${entityId}/custom-fields`,
    { custom_fields: values },
  );
  return response.custom_fields ?? {};
}
