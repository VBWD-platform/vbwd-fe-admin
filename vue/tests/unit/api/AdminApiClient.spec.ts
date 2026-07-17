import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiClient, ApiError } from 'vbwd-view-component';
import { AdminApiClient } from '@/api';

/**
 * The fe-admin shared HTTP client wraps fe-core's ApiClient (S? License gate).
 *
 * FROZEN backend contract: when `LICENSE_REQUIRED=true` and the license does
 * NOT cover CMS, every `/api/v1/admin/cms/...` call returns
 *   HTTP 402  {"error":"License required","feature":"cms"}
 *
 * fe-core's ApiError discards the JSON body (keeping only `status`), so the
 * fe-admin client detects the CMS license block from `status === 402` on a
 * CMS-admin URL and notifies registered `onLicenseBlocked` listeners. Nothing
 * in fe-core is touched.
 */
describe('AdminApiClient — CMS license-block detection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeClient(): AdminApiClient {
    return new AdminApiClient({ baseURL: '/api/v1' });
  }

  it('notifies onLicenseBlocked("cms") when a CMS admin GET 402s', async () => {
    vi.spyOn(ApiClient.prototype, 'get').mockRejectedValue(
      new ApiError('License required', 402),
    );
    const client = makeClient();
    const listener = vi.fn();
    client.onLicenseBlocked(listener);

    await expect(client.get('/admin/cms/pages')).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('cms');
  });

  it('notifies onLicenseBlocked when a CMS admin write (PUT) 402s', async () => {
    vi.spyOn(ApiClient.prototype, 'put').mockRejectedValue(
      new ApiError('License required', 402),
    );
    const client = makeClient();
    const listener = vi.fn();
    client.onLicenseBlocked(listener);

    await expect(client.put('/admin/cms/pages/1', {})).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledWith('cms');
  });

  it('does NOT notify on a 402 for a non-CMS URL', async () => {
    vi.spyOn(ApiClient.prototype, 'get').mockRejectedValue(
      new ApiError('License required', 402),
    );
    const client = makeClient();
    const listener = vi.fn();
    client.onLicenseBlocked(listener);

    await expect(client.get('/admin/users')).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
  });

  it('does NOT notify on a 401 (still handled as token-expired)', async () => {
    vi.spyOn(ApiClient.prototype, 'get').mockRejectedValue(
      new ApiError('Invalid or expired token', 401),
    );
    const client = makeClient();
    const listener = vi.fn();
    client.onLicenseBlocked(listener);

    await expect(client.get('/admin/cms/pages')).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
  });

  it('does NOT notify on a 403 (still handled as forbidden)', async () => {
    vi.spyOn(ApiClient.prototype, 'get').mockRejectedValue(
      new ApiError('Forbidden', 403),
    );
    const client = makeClient();
    const listener = vi.fn();
    client.onLicenseBlocked(listener);

    await expect(client.get('/admin/cms/pages')).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
  });

  it('does NOT notify on a non-402 error for a CMS URL', async () => {
    vi.spyOn(ApiClient.prototype, 'get').mockRejectedValue(
      new ApiError('Server error', 500),
    );
    const client = makeClient();
    const listener = vi.fn();
    client.onLicenseBlocked(listener);

    await expect(client.get('/admin/cms/pages')).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
  });

  it('leaves a successful (200) CMS admin GET untouched — no notification', async () => {
    const payload = { pages: [] };
    vi.spyOn(ApiClient.prototype, 'get').mockResolvedValue(payload);
    const client = makeClient();
    const listener = vi.fn();
    client.onLicenseBlocked(listener);

    await expect(client.get('/admin/cms/pages')).resolves.toEqual(payload);

    expect(listener).not.toHaveBeenCalled();
  });
});
