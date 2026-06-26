import { describe, it, expect } from 'vitest';
import { usePluginBulkSelection } from '@/composables/usePluginBulkSelection';

describe('usePluginBulkSelection', () => {
  it('toggles a single name on and off', () => {
    const sel = usePluginBulkSelection();
    expect(sel.has('a')).toBe(false);
    sel.toggle('a');
    expect(sel.has('a')).toBe(true);
    expect(sel.selectedCount.value).toBe(1);
    sel.toggle('a');
    expect(sel.has('a')).toBe(false);
    expect(sel.selectedCount.value).toBe(0);
  });

  it('togglePage selects all page names, then clears them when all selected', () => {
    const sel = usePluginBulkSelection();
    const page = ['a', 'b', 'c'];
    sel.togglePage(page);
    expect(sel.pageAllSelected(page)).toBe(true);
    expect(sel.selectedCount.value).toBe(3);
    sel.togglePage(page);
    expect(sel.pageAllSelected(page)).toBe(false);
    expect(sel.selectedCount.value).toBe(0);
  });

  it('pageAllSelected is false for an empty page or a partial selection', () => {
    const sel = usePluginBulkSelection();
    expect(sel.pageAllSelected([])).toBe(false);
    sel.toggle('a');
    expect(sel.pageAllSelected(['a', 'b'])).toBe(false);
  });

  it('selectAllMatching adds the whole filtered set', () => {
    const sel = usePluginBulkSelection();
    sel.toggle('a');
    sel.selectAllMatching(['a', 'b', 'c', 'd']);
    expect(sel.selectedCount.value).toBe(4);
    expect(sel.values().sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('selection persists across different page name lists (page change)', () => {
    const sel = usePluginBulkSelection();
    sel.togglePage(['a', 'b']); // page 1
    // navigate to page 2 — different names; previous selection must remain
    expect(sel.has('a')).toBe(true);
    expect(sel.pageAllSelected(['c', 'd'])).toBe(false);
    sel.togglePage(['c', 'd']); // page 2
    expect(sel.selectedCount.value).toBe(4);
    expect(sel.has('a')).toBe(true);
    expect(sel.has('c')).toBe(true);
  });

  it('clear empties the selection', () => {
    const sel = usePluginBulkSelection();
    sel.selectAllMatching(['a', 'b', 'c']);
    expect(sel.selectedCount.value).toBe(3);
    sel.clear();
    expect(sel.selectedCount.value).toBe(0);
  });
});
