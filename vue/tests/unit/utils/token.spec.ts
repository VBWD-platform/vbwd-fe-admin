import { describe, it, expect } from 'vitest';
import { decodeJwtExp, isTokenExpired } from '@/utils/token';

/** Build a decodable (unsigned) JWT-shaped string with the given payload. */
function makeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

describe('decodeJwtExp', () => {
  it('returns the exp integer for a well-formed 3-part JWT', () => {
    expect(decodeJwtExp(makeJwt({ exp: 1893456000, sub: 'a' }))).toBe(1893456000);
  });

  it('returns null for an empty string', () => {
    expect(decodeJwtExp('')).toBeNull();
  });

  it('returns null for non-JWT garbage', () => {
    expect(decodeJwtExp('not-a-token')).toBeNull();
  });

  it('returns null for a 2-part token', () => {
    expect(decodeJwtExp('header.payload')).toBeNull();
  });

  it('returns null when the payload is not valid base64url JSON', () => {
    expect(decodeJwtExp('header.$$$notbase64$$$.sig')).toBeNull();
  });

  it('returns null when the payload carries no exp', () => {
    expect(decodeJwtExp(makeJwt({ sub: 'a' }))).toBeNull();
  });

  it('returns null when exp is present but not a number', () => {
    expect(decodeJwtExp(makeJwt({ exp: 'soon' }))).toBeNull();
  });
});

describe('isTokenExpired', () => {
  const now = () => 1_000_000 * 1000; // 1,000,000s since epoch, in ms

  it('is false when exp is in the future', () => {
    expect(isTokenExpired(makeJwt({ exp: 2_000_000 }), now)).toBe(false);
  });

  it('is true when exp is in the past', () => {
    expect(isTokenExpired(makeJwt({ exp: 500_000 }), now)).toBe(true);
  });

  it('is true when exp equals now (boundary — treat as expired)', () => {
    expect(isTokenExpired(makeJwt({ exp: 1_000_000 }), now)).toBe(true);
  });

  it('is false (conservative) when the token cannot be decoded', () => {
    expect(isTokenExpired('opaque-non-jwt', now)).toBe(false);
  });

  it('uses the injected clock, not wall-clock', () => {
    const frozenPast = () => 0;
    // exp=1 is in the past for wall-clock but in the future for the frozen 0.
    expect(isTokenExpired(makeJwt({ exp: 1 }), frozenPast)).toBe(false);
  });
});
