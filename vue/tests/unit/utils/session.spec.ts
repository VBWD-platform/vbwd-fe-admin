import { describe, it, expect, beforeEach, vi } from 'vitest';
import { purgeExpiredSession } from '@/utils/session';

/** Build a decodable (unsigned) JWT-shaped string with the given payload. */
function makeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

const STORAGE_KEY = 'admin_token';
const now = () => 1_000_000 * 1000;
const expiredJwt = makeJwt({ exp: 500_000 });
const validJwt = makeJwt({ exp: 2_000_000 });

function seedStorage(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
  localStorage.setItem(`${STORAGE_KEY}_refresh`, 'refresh-xyz');
  localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify({ id: 'u-1' }));
}

describe('purgeExpiredSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('purges an expired session: nulls store state, clears storage + api token, returns true', () => {
    const store = { token: expiredJwt, refreshToken: 'refresh-xyz', user: { id: 'u-1' } };
    seedStorage(expiredJwt);
    const clearApiToken = vi.fn();

    const purged = purgeExpiredSession(store, STORAGE_KEY, clearApiToken, now);

    expect(purged).toBe(true);
    expect(store.token).toBeNull();
    expect(store.refreshToken).toBeNull();
    expect(store.user).toBeNull();
    expect(clearApiToken).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEY}_refresh`)).toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEY}_user`)).toBeNull();
  });

  it('leaves a valid session untouched and returns false', () => {
    const store = { token: validJwt, refreshToken: 'refresh-xyz', user: { id: 'u-1' } };
    seedStorage(validJwt);
    const clearApiToken = vi.fn();

    const purged = purgeExpiredSession(store, STORAGE_KEY, clearApiToken, now);

    expect(purged).toBe(false);
    expect(store.token).toBe(validJwt);
    expect(store.user).toEqual({ id: 'u-1' });
    expect(clearApiToken).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(validJwt);
  });

  it('is a no-op when there is no token', () => {
    const store = { token: null, refreshToken: null, user: null };
    const clearApiToken = vi.fn();

    expect(purgeExpiredSession(store, STORAGE_KEY, clearApiToken, now)).toBe(false);
    expect(clearApiToken).not.toHaveBeenCalled();
  });

  it('leaves an opaque (undecodable) token in place — server 401 is the backstop', () => {
    const store = { token: 'opaque-non-jwt', refreshToken: null, user: { id: 'u-1' } };
    seedStorage('opaque-non-jwt');
    const clearApiToken = vi.fn();

    expect(purgeExpiredSession(store, STORAGE_KEY, clearApiToken, now)).toBe(false);
    expect(store.token).toBe('opaque-non-jwt');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('opaque-non-jwt');
  });
});
