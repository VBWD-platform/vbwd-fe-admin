/**
 * useDataExchangeManifest (S46.4).
 *
 * Single home (DRY) for the per-list Import/Export controls to discover which
 * data-exchange capabilities the current user holds for a given entity. The
 * backend `GET /admin/data-exchange/manifest` is already permission- and
 * config-filtered, so the per-list control derives its `can_export` /
 * `can_import` / `can_export_pii` flags from it rather than re-deriving from raw
 * permissions. Unknown / unpermitted entities default to all-false → R12 hides
 * the control.
 */
import { ref } from 'vue';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import type {
  DataExchangeFormat,
  DataExchangeManifestEntry,
} from 'vbwd-view-component';

const MANIFEST_URL = '/admin/data-exchange/manifest';

export interface EntityCapabilities {
  can_export: boolean;
  can_import: boolean;
  can_export_pii: boolean;
  supported_formats: DataExchangeFormat[];
}

const EMPTY_CAPABILITIES: EntityCapabilities = {
  can_export: false,
  can_import: false,
  can_export_pii: false,
  supported_formats: ['json'],
};

export function useDataExchangeManifest() {
  const api = createDataExchangeApi();
  const entries = ref<DataExchangeManifestEntry[]>([]);

  async function load(): Promise<void> {
    try {
      const response = await api.getJson<
        DataExchangeManifestEntry[] | { entities: DataExchangeManifestEntry[] }
      >(MANIFEST_URL);
      if (Array.isArray(response)) {
        entries.value = response;
      } else if (response && Array.isArray(response.entities)) {
        entries.value = response.entities;
      } else {
        entries.value = [];
      }
    } catch {
      // No manifest (e.g. no permission) → controls stay hidden. Never throw:
      // a list page must still render its rows even if export is unavailable.
      entries.value = [];
    }
  }

  function capabilitiesFor(entityKey: string): EntityCapabilities {
    const entry = entries.value.find((item) => item.entity_key === entityKey);
    if (!entry) {
      return { ...EMPTY_CAPABILITIES };
    }
    return {
      can_export: entry.can_export,
      can_import: entry.can_import,
      can_export_pii: entry.can_export_pii,
      supported_formats: entry.supported_formats,
    };
  }

  return { entries, load, capabilitiesFor };
}
