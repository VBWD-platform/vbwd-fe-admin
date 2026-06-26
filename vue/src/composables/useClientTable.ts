import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';

/**
 * Client-side table mechanics — filter (quicksearch) → sort → paginate — over
 * an already-loaded list. Shared by the three plugin tabs in Settings.vue
 * (S102) so the search/sort/paginate logic lives in ONE tested place rather
 * than being copy-pasted per tab.
 *
 * The caller owns the query / sortKey / sortDir / rowsPerPage refs (they are
 * usually bound to inputs), supplies a `matches` predicate for the quicksearch
 * and an optional `sortValue` accessor, and gets back the derived `paged` slice
 * plus the page controls. Page state is owned here.
 *
 * Compose rules (S102 decision #9):
 *   - pipeline order is filter → sort → paginate;
 *   - changing the query or rowsPerPage resets to page 1;
 *   - the page is always clamped into [1, pageCount] (so a sort/toggle that
 *     shrinks the result never leaves the view on a now-empty page).
 */
export type SortDir = 'asc' | 'desc';
export type RowsPerPage = number | 'all';

export interface ClientTableOptions<T> {
  /** The full, already-loaded source list. */
  source: Ref<T[]> | ComputedRef<T[]>;
  /** Quicksearch predicate; `query` is pre-trimmed + lower-cased. */
  matches: (item: T, query: string) => boolean;
  /** The search query (owned by the caller, bound to the search input). */
  query: Ref<string>;
  /** Current sort column key. */
  sortKey: Ref<string>;
  /** Current sort direction. */
  sortDir: Ref<SortDir>;
  /** How many rows per page; `'all'` disables slicing. */
  rowsPerPage: Ref<RowsPerPage>;
  /**
   * Optional accessor returning the comparable string for a (item, key). The
   * default reads `String(item[key] ?? '')`.
   */
  sortValue?: (item: T, key: string) => string;
  /** Initial page (default 1). */
  initialPage?: number;
}

export interface ClientTable<T> {
  page: Ref<number>;
  /** Search-applied list (pre-sort, pre-page). */
  filtered: ComputedRef<T[]>;
  /** Search + sort applied (pre-page) — the full "matching" set. */
  sorted: ComputedRef<T[]>;
  /** The current page slice (what the table renders). */
  paged: ComputedRef<T[]>;
  /** Count of matching rows (= sorted.length). */
  total: ComputedRef<number>;
  /** Number of pages (>= 1; always 1 when rowsPerPage === 'all'). */
  pageCount: ComputedRef<number>;
  /** 1-based index of the first row on the current page (0 when empty). */
  pageStart: ComputedRef<number>;
  /** 1-based index of the last row on the current page (0 when empty). */
  pageEnd: ComputedRef<number>;
  /** Set the page, clamped into [1, pageCount]. */
  setPage: (page: number) => void;
}

export function useClientTable<T>(options: ClientTableOptions<T>): ClientTable<T> {
  const page = ref(options.initialPage ?? 1);

  const filtered = computed<T[]>(() => {
    const query = options.query.value.trim().toLowerCase();
    if (!query) {
      return options.source.value.slice();
    }
    return options.source.value.filter(item => options.matches(item, query));
  });

  const sorted = computed<T[]>(() => {
    const valueOf =
      options.sortValue ??
      ((item: T, key: string): string => String((item as Record<string, unknown>)[key] ?? ''));
    const key = options.sortKey.value;
    const direction = options.sortDir.value === 'asc' ? 1 : -1;
    // slice() so we never mutate the source array in place.
    return filtered.value
      .slice()
      .sort((a, b) => valueOf(a, key).localeCompare(valueOf(b, key)) * direction);
  });

  const total = computed(() => sorted.value.length);

  const pageCount = computed(() => {
    if (options.rowsPerPage.value === 'all') {
      return 1;
    }
    const size = options.rowsPerPage.value || 1;
    return Math.max(1, Math.ceil(total.value / size));
  });

  // Keep the page in range whenever the number of pages shrinks (a search, a
  // bigger page size, or a toggle that drops the matching count).
  watch(pageCount, (count) => {
    if (page.value > count) {
      page.value = count;
    } else if (page.value < 1) {
      page.value = 1;
    }
  });

  // A new query or page size starts the user back at the top.
  watch([options.query, options.rowsPerPage], () => {
    page.value = 1;
  });

  const paged = computed<T[]>(() => {
    if (options.rowsPerPage.value === 'all') {
      return sorted.value;
    }
    const size = options.rowsPerPage.value;
    const start = (page.value - 1) * size;
    return sorted.value.slice(start, start + size);
  });

  const pageStart = computed(() => {
    if (total.value === 0) {
      return 0;
    }
    if (options.rowsPerPage.value === 'all') {
      return 1;
    }
    return (page.value - 1) * options.rowsPerPage.value + 1;
  });

  const pageEnd = computed(() => {
    if (total.value === 0) {
      return 0;
    }
    if (options.rowsPerPage.value === 'all') {
      return total.value;
    }
    return Math.min(page.value * options.rowsPerPage.value, total.value);
  });

  function setPage(target: number): void {
    page.value = Math.min(Math.max(1, target), pageCount.value);
  }

  return { page, filtered, sorted, paged, total, pageCount, pageStart, pageEnd, setPage };
}
