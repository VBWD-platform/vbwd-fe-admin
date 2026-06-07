/**
 * S46.4 — DataExchangeApi adapter (fe-admin wiring).
 *
 * The fe-core data-exchange surface depends on a narrow `DataExchangeApi` port
 * (getJson / postForBlob / postFormForJson). fe-admin supplies an adapter over
 * its shared `ApiClient`. These tests fence the mapping:
 *   - getJson         → api.get(url)
 *   - postForBlob     → api.post(url, body, { responseType: 'blob' })
 *   - postFormForJson → api.post(url, formData)   (FormData, no responseType)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { createDataExchangeApi } from '@/api/dataExchangeApi';

describe('createDataExchangeApi (S46.4 adapter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getJson delegates to api.get and returns the JSON body', async () => {
    get.mockResolvedValue([{ entity_key: 'users' }]);
    const adapter = createDataExchangeApi();

    const result = await adapter.getJson('/admin/data-exchange/manifest');

    expect(get).toHaveBeenCalledWith('/admin/data-exchange/manifest');
    expect(result).toEqual([{ entity_key: 'users' }]);
  });

  it('postForBlob posts the body and asks the client for a blob response', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    post.mockResolvedValue(blob);
    const adapter = createDataExchangeApi();

    const result = await adapter.postForBlob('/admin/data-exchange/users/export', {
      all: true,
    });

    expect(post).toHaveBeenCalledWith(
      '/admin/data-exchange/users/export',
      { all: true },
      { responseType: 'blob' },
    );
    expect(result).toBe(blob);
  });

  it('strips a leading /api/v1 prefix (fe-core sends absolute URLs; baseURL re-adds it)', async () => {
    get.mockResolvedValue([]);
    const blob = new Blob(['{}']);
    post.mockResolvedValue(blob);
    const adapter = createDataExchangeApi();

    await adapter.getJson('/api/v1/admin/data-exchange/manifest');
    await adapter.postForBlob('/api/v1/admin/data-exchange/users/export', { all: true });

    expect(get).toHaveBeenCalledWith('/admin/data-exchange/manifest');
    expect(post).toHaveBeenCalledWith(
      '/admin/data-exchange/users/export',
      { all: true },
      { responseType: 'blob' },
    );
  });

  it('postFormForJson posts the FormData unchanged (interceptor drops content-type)', async () => {
    post.mockResolvedValue({ created: 1, updated: 0, skipped: 0, errors: [] });
    const adapter = createDataExchangeApi();
    const form = new FormData();
    form.append('file', new File(['x'], 'users.json'));

    const result = await adapter.postFormForJson('/admin/data-exchange/users/import', form);

    expect(post).toHaveBeenCalledWith('/admin/data-exchange/users/import', form);
    // No responseType / extra config — FormData posts as multipart.
    expect(post.mock.calls[0].length).toBe(2);
    expect(result).toEqual({ created: 1, updated: 0, skipped: 0, errors: [] });
  });
});
