import { reactive, computed, type ComputedRef } from 'vue';

/**
 * Bulk-selection mechanics for the plugin tables (S102), keyed by plugin
 * `name` so a selection SURVIVES paging and re-sorting (a name chosen on page 1
 * stays chosen on page 2).
 *
 * Two-scope select-all (S102 decision #3):
 *   - `togglePage(pageNames)` selects/clears just the rows on the current page;
 *   - `selectAllMatching(filteredNames)` extends the selection to the whole
 *     filtered set (the "Select all N matching" banner action).
 *
 * The composable knows nothing about APIs or plugin shapes — the view supplies
 * the name lists and wires the action callbacks (single responsibility).
 */
export interface PluginBulkSelection {
  selected: Set<string>;
  selectedCount: ComputedRef<number>;
  has: (name: string) => boolean;
  toggle: (name: string) => void;
  /** True when every name on the page is selected (and the page is non-empty). */
  pageAllSelected: (pageNames: string[]) => boolean;
  /** Select all page names, or clear them if they are already all selected. */
  togglePage: (pageNames: string[]) => void;
  /** Add every matching (filtered) name to the selection. */
  selectAllMatching: (filteredNames: string[]) => void;
  clear: () => void;
  /** The selected names as an array (insertion order). */
  values: () => string[];
}

export function usePluginBulkSelection(): PluginBulkSelection {
  const selected = reactive(new Set<string>());

  const selectedCount = computed(() => selected.size);

  function has(name: string): boolean {
    return selected.has(name);
  }

  function toggle(name: string): void {
    if (selected.has(name)) {
      selected.delete(name);
    } else {
      selected.add(name);
    }
  }

  function pageAllSelected(pageNames: string[]): boolean {
    return pageNames.length > 0 && pageNames.every(name => selected.has(name));
  }

  function togglePage(pageNames: string[]): void {
    if (pageAllSelected(pageNames)) {
      pageNames.forEach(name => selected.delete(name));
    } else {
      pageNames.forEach(name => selected.add(name));
    }
  }

  function selectAllMatching(filteredNames: string[]): void {
    filteredNames.forEach(name => selected.add(name));
  }

  function clear(): void {
    selected.clear();
  }

  function values(): string[] {
    return Array.from(selected);
  }

  return {
    selected,
    selectedCount,
    has,
    toggle,
    pageAllSelected,
    togglePage,
    selectAllMatching,
    clear,
    values,
  };
}
