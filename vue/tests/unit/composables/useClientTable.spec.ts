import { describe, it, expect } from 'vitest';
import { ref, nextTick } from 'vue';
import { useClientTable, type RowsPerPage, type SortDir } from '@/composables/useClientTable';

interface Row {
  name: string;
  version: string;
}

function makeRows(count: number): Row[] {
  // r01, r02, … so default string sort is stable/predictable.
  return Array.from({ length: count }, (_unused, index) => {
    const n = String(index + 1).padStart(2, '0');
    return { name: `r${n}`, version: '1.0.0' };
  });
}

function setup(rows: Row[], rowsPerPage: RowsPerPage = 25) {
  const source = ref(rows);
  const query = ref('');
  const sortKey = ref('name');
  const sortDir = ref<SortDir>('asc');
  const rpp = ref<RowsPerPage>(rowsPerPage);
  const table = useClientTable<Row>({
    source,
    query,
    sortKey,
    sortDir,
    rowsPerPage: rpp,
    matches: (item, q) => item.name.toLowerCase().includes(q),
  });
  return { source, query, sortKey, sortDir, rowsPerPage: rpp, table };
}

describe('useClientTable', () => {
  it('paginates the sorted list and reports page metadata', () => {
    const { table } = setup(makeRows(30), 25);
    expect(table.total.value).toBe(30);
    expect(table.pageCount.value).toBe(2);
    expect(table.paged.value).toHaveLength(25);
    expect(table.paged.value[0].name).toBe('r01');
    expect(table.pageStart.value).toBe(1);
    expect(table.pageEnd.value).toBe(25);

    table.setPage(2);
    expect(table.paged.value).toHaveLength(5);
    expect(table.paged.value[0].name).toBe('r26');
    expect(table.pageStart.value).toBe(26);
    expect(table.pageEnd.value).toBe(30);
  });

  it('applies the quicksearch before sorting/paging', () => {
    const { query, table } = setup(makeRows(30), 25);
    query.value = 'r1'; // r10..r19 (10 rows)
    expect(table.total.value).toBe(10);
    expect(table.paged.value.every(r => r.name.startsWith('r1'))).toBe(true);
  });

  it("rowsPerPage='all' returns everything on a single page", () => {
    const { table } = setup(makeRows(30), 'all');
    expect(table.pageCount.value).toBe(1);
    expect(table.paged.value).toHaveLength(30);
    expect(table.pageStart.value).toBe(1);
    expect(table.pageEnd.value).toBe(30);
  });

  it('sorts ascending and descending by the chosen key', () => {
    const { sortDir, table } = setup(makeRows(5), 25);
    expect(table.sorted.value[0].name).toBe('r01');
    sortDir.value = 'desc';
    expect(table.sorted.value[0].name).toBe('r05');
  });

  it('resets to page 1 when the query changes', async () => {
    const { query, table } = setup(makeRows(60), 25);
    table.setPage(3);
    expect(table.page.value).toBe(3);
    query.value = 'r';
    await nextTick();
    expect(table.page.value).toBe(1);
  });

  it('resets to page 1 when rowsPerPage changes', async () => {
    const { rowsPerPage, table } = setup(makeRows(60), 25);
    table.setPage(3);
    rowsPerPage.value = 50;
    await nextTick();
    expect(table.page.value).toBe(1);
  });

  it('clamps an out-of-range page when the matching set shrinks', async () => {
    const { source, table } = setup(makeRows(60), 25); // 3 pages
    table.setPage(3);
    expect(table.page.value).toBe(3);
    // Drop the source down to a single page worth of rows.
    source.value = makeRows(5);
    await nextTick();
    expect(table.pageCount.value).toBe(1);
    expect(table.page.value).toBe(1);
    expect(table.paged.value).toHaveLength(5);
  });

  it('setPage clamps into [1, pageCount]', () => {
    const { table } = setup(makeRows(30), 25); // 2 pages
    table.setPage(99);
    expect(table.page.value).toBe(2);
    table.setPage(-5);
    expect(table.page.value).toBe(1);
  });

  it('reports zeroed page bounds for an empty result', () => {
    const { query, table } = setup(makeRows(10), 25);
    query.value = 'zzz-nope';
    expect(table.total.value).toBe(0);
    expect(table.pageStart.value).toBe(0);
    expect(table.pageEnd.value).toBe(0);
    expect(table.paged.value).toHaveLength(0);
  });
});
