import { describe, it, expect } from 'vitest';
import { AdminApiClient } from '@/api';

/**
 * Seat/token provisioning refusals.
 *
 * FROZEN backend contract: `POST /api/v1/admin/users/` can be refused by the
 * provisioning guard with a structured body:
 *   402 {"error":"...","code":"TOKENS_REQUIRED","action":{"label":"Buy tokens","url":"/dashboard/tokens"}}
 *   403 {"error":"...","code":"SEAT_LIMIT_REACHED","action":{"label":"Upgrade plan","url":"/checkout?tarif_plan_id=pro"}}
 *
 * fe-core's `ApiError` keeps only `status`/`message` (the JSON body — including
 * `code`/`action` — is discarded). fe-admin's `AdminApiClient` must preserve
 * the structured body on the thrown error so the UserCreate view can render a
 * clickable Buy-tokens / Upgrade-plan link. fe-core is NOT touched.
 */
type AxiosLikeReject = {
  config: { url?: string };
  request: unknown;
  response: { status: number; statusText: string; data: unknown };
  isAxiosError: true;
  message: string;
};

interface StructuredError extends Error {
  status?: number;
  data?: { error?: string; code?: string; action?: { label: string; url: string } };
}

/**
 * Build an AdminApiClient whose underlying axios instance rejects the next
 * request with a real HTTP error carrying the given status + body, exercising
 * the full request path (fe-core interceptors + error conversion) rather than
 * stubbing the prototype.
 */
function makeClientRejectingWith(status: number, statusText: string, body: unknown): AdminApiClient {
  const client = new AdminApiClient({ baseURL: '/api/v1' });
  const axiosInstance = (client as unknown as {
    axiosInstance: { defaults: { adapter: (config: { url?: string }) => Promise<never> } };
  }).axiosInstance;
  axiosInstance.defaults.adapter = (config: { url?: string }): Promise<never> => {
    const rejection: AxiosLikeReject = {
      config,
      request: {},
      response: { status, statusText, data: body },
      isAxiosError: true,
      message: (body as { error?: string })?.error ?? statusText,
    };
    return Promise.reject(rejection);
  };
  return client;
}

describe('AdminApiClient — provisioning refusal body preservation', () => {
  it('surfaces code + action from a 402 TOKENS_REQUIRED body', async () => {
    const body = {
      error: 'Not enough tokens to create this admin (need 5, have 1). Buy tokens to continue.',
      code: 'TOKENS_REQUIRED',
      action: { label: 'Buy tokens', url: '/dashboard/tokens' },
    };
    const client = makeClientRejectingWith(402, 'Payment Required', body);

    const error = await client.post('/admin/users/', {}).then(
      () => { throw new Error('expected rejection'); },
      (caught: StructuredError) => caught,
    );

    expect(error.status).toBe(402);
    expect(error.data?.code).toBe('TOKENS_REQUIRED');
    expect(error.data?.action?.label).toBe('Buy tokens');
    expect(error.data?.action?.url).toBe('/dashboard/tokens');
  });

  it('surfaces code + action from a 403 SEAT_LIMIT_REACHED body', async () => {
    const body = {
      error: 'Seat limit reached (3 of 3 used). Upgrade your plan to add more admins.',
      code: 'SEAT_LIMIT_REACHED',
      action: { label: 'Upgrade plan', url: '/checkout?tarif_plan_id=pro' },
    };
    const client = makeClientRejectingWith(403, 'Forbidden', body);

    const error = await client.post('/admin/users/', {}).then(
      () => { throw new Error('expected rejection'); },
      (caught: StructuredError) => caught,
    );

    expect(error.status).toBe(403);
    expect(error.data?.code).toBe('SEAT_LIMIT_REACHED');
    expect(error.data?.action?.url).toBe('/checkout?tarif_plan_id=pro');
  });

  it('does NOT attach structured data for a plain 500 error (no code)', async () => {
    const client = makeClientRejectingWith(500, 'Internal Server Error', { error: 'Boom' });

    const error = await client.post('/admin/users/', {}).then(
      () => { throw new Error('expected rejection'); },
      (caught: StructuredError) => caught,
    );

    expect(error.status).toBe(500);
    expect(error.data).toBeUndefined();
  });
});
