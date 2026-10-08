import { createAuthClient } from 'better-auth/react';

// Same origin as the app, so the default base URL and /api/auth path apply.
export const authClient = createAuthClient();
