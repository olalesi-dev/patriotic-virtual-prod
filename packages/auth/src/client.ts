import { createAuthClient } from 'better-auth/react';
import { twoFactorClient, adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  plugins: [twoFactorClient(), adminClient()],
});
