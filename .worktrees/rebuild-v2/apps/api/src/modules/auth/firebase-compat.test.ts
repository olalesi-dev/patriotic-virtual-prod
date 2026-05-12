import { describe, expect, it } from 'bun:test';
import {
  decodeFirebaseJwt,
  getBearerToken,
  validateFirebasePayload,
} from './firebase-compat';
import { UnauthorizedException } from '../../utils/errors';

const encodeJwtPart = (value: unknown) =>
  Buffer.from(JSON.stringify(value))
    .toString('base64url');

describe('Firebase auth compatibility', () => {
  it('extracts bearer tokens from authorization headers', () => {
    const headers = new Headers({
      authorization: 'Bearer firebase-token',
    });

    expect(getBearerToken(headers)).toBe('firebase-token');
    expect(getBearerToken(new Headers())).toBeNull();
  });

  it('decodes Firebase JWT header and payload without accepting malformed input', () => {
    const token = [
      encodeJwtPart({ alg: 'RS256', kid: 'key-1' }),
      encodeJwtPart({
        aud: 'project-1',
        iss: 'https://securetoken.google.com/project-1',
        sub: 'firebase-user-id',
      }),
      'signature',
    ].join('.');

    const decoded = decodeFirebaseJwt(token);

    expect(decoded.header.kid).toBe('key-1');
    expect(decoded.payload.sub).toBe('firebase-user-id');
    expect(() => decodeFirebaseJwt('not-a-jwt')).toThrow(UnauthorizedException);
  });

  it('validates issuer, audience, subject, iat, and expiration', () => {
    validateFirebasePayload(
      {
        aud: 'project-1',
        iss: 'https://securetoken.google.com/project-1',
        sub: 'firebase-user-id',
        iat: 100,
        exp: 200,
      },
      'project-1',
      150,
    );

    expect(() =>
      validateFirebasePayload(
        {
          aud: 'other-project',
          iss: 'https://securetoken.google.com/other-project',
          sub: 'firebase-user-id',
          iat: 100,
          exp: 200,
        },
        'project-1',
        150,
      ),
    ).toThrow(UnauthorizedException);

    expect(() =>
      validateFirebasePayload(
        {
          aud: 'project-1',
          iss: 'https://securetoken.google.com/project-1',
          sub: 'firebase-user-id',
          iat: 100,
          exp: 120,
        },
        'project-1',
        150,
      ),
    ).toThrow(UnauthorizedException);
  });
});
