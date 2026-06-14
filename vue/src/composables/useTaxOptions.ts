import { ref, type Ref } from 'vue';
import { api } from '@/api';
import type { DualListOption } from '@/components/DualListSelector.vue';

/**
 * Shared catalog of active core taxes for the per-entity "Taxes" blocks in
 * the plan / product / resource admin forms (S72.3).
 *
 * The core Tax catalog is fetched from `GET /api/v1/admin/tax/rates` ONCE and
 * shared across every form that calls `useTaxOptions()` (DRY): a single
 * in-flight promise is reused so concurrent forms never refetch.
 */
interface ActiveTaxRate {
  id: string;
  code: string;
  name: string;
  rate: string;
  is_active: boolean;
}

const taxOptions: Ref<DualListOption[]> = ref([]);
const loading = ref(false);
let inFlight: Promise<void> | null = null;
let loaded = false;

function buildLabel(rate: ActiveTaxRate): string {
  return `${rate.name} (${rate.rate}%)`;
}

async function fetchActiveTaxOptions(): Promise<void> {
  loading.value = true;
  try {
    const response = (await api.get('/admin/tax/rates')) as { rates?: ActiveTaxRate[] } | undefined;
    const rates = response?.rates ?? [];
    taxOptions.value = rates
      .filter(rate => rate.is_active)
      .map(rate => ({ value: rate.id, label: buildLabel(rate) }));
    loaded = true;
  } catch {
    // The Taxes block is a non-critical enhancement; leave it empty on failure
    // rather than breaking the host form. Stays unmarked so a later call retries.
    taxOptions.value = [];
  } finally {
    loading.value = false;
  }
}

export function useTaxOptions(): {
  taxOptions: Ref<DualListOption[]>;
  loading: Ref<boolean>;
  loadTaxOptions: () => Promise<void>;
} {
  async function loadTaxOptions(): Promise<void> {
    if (loaded) return;
    if (!inFlight) {
      inFlight = fetchActiveTaxOptions().finally(() => {
        inFlight = null;
      });
    }
    await inFlight;
  }

  return { taxOptions, loading, loadTaxOptions };
}

/** Test-only: clears the shared cache so each spec starts from a clean slate. */
export function __resetTaxOptionsCache(): void {
  taxOptions.value = [];
  loading.value = false;
  inFlight = null;
  loaded = false;
}
