import Passkey from 'next-auth/providers/passkey';
import type { WebAuthnConfig } from 'next-auth/providers/webauthn';
import { getAppBaseUrl } from '@/lib/app-url';

const PROD_ORIGINS = ['https://www.savepoint.life', 'https://savepoint.life'] as const;
const PROD_RP_ID = 'savepoint.life';

function uniqueStrings(values: Array<string | string[] | undefined | null>): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) out.push(...value);
    else out.push(value);
  }
  return [...new Set(out.filter(Boolean))];
}

/**
 * Auth.js Passkey provider tuned for savepoint.life (www + apex) and localhost.
 * Default getRelayingParty only keeps the first origin, which breaks verification
 * when AUTH_URL and the browser origin disagree (common www vs apex mismatch).
 */
export function createPasskeyProvider(): WebAuthnConfig {
  const base = Passkey({});

  return {
    ...base,
    getRelayingParty(options) {
      const hostname = options.url.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      const appOrigin = getAppBaseUrl();

      return {
        id: isLocal ? hostname : PROD_RP_ID,
        name: 'Savepoint',
        // Prefer the live request origin; fall back to configured app URL.
        origin: options.url.origin || appOrigin,
      };
    },
    simpleWebAuthn: {
      ...base.simpleWebAuthn,
      verifyRegistrationResponse: async (opts) => {
        const expectedOrigin = uniqueStrings([
          opts.expectedOrigin,
          getAppBaseUrl(),
          ...PROD_ORIGINS,
          'http://localhost:3000',
        ]);
        const expectedRPID = uniqueStrings([
          opts.expectedRPID,
          PROD_RP_ID,
          'localhost',
        ]);
        try {
          return await base.simpleWebAuthn.verifyRegistrationResponse({
            ...opts,
            expectedOrigin,
            expectedRPID,
          });
        } catch (error) {
          console.error('Passkey registration verification failed', {
            expectedOrigin,
            expectedRPID,
            error,
          });
          throw error;
        }
      },
      verifyAuthenticationResponse: async (opts) => {
        const expectedOrigin = uniqueStrings([
          opts.expectedOrigin,
          getAppBaseUrl(),
          ...PROD_ORIGINS,
          'http://localhost:3000',
        ]);
        const expectedRPID = uniqueStrings([
          opts.expectedRPID,
          PROD_RP_ID,
          'localhost',
        ]);
        try {
          return await base.simpleWebAuthn.verifyAuthenticationResponse({
            ...opts,
            expectedOrigin,
            expectedRPID,
          });
        } catch (error) {
          console.error('Passkey authentication verification failed', {
            expectedOrigin,
            expectedRPID,
            error,
          });
          throw error;
        }
      },
    },
  };
}
