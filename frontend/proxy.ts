// Auth guard disabled for local preview.
// To enable: configure AUTH_GITHUB_ID + AUTH_GITHUB_SECRET in .env.local, then replace this file with the auth-guarded version.
import type { NextRequest } from 'next/server';

export function proxy(_req: NextRequest) {
  // no-op: allow all requests through for local preview
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
