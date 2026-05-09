import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Auth middleware — runs on every request matched by `config.matcher`.
 *
 * `getSessionCookie` only checks for the cookie's presence, not its
 * cryptographic validity (Better Auth's recommendation: the actual
 * verification happens on the server inside `auth.api.getSession`). This
 * middleware is the optimistic gate; protected routes that need the user
 * id must call getSession on the server.
 */
export function middleware(req: NextRequest) {
  const sessionCookie = getSessionCookie(req);
  if (sessionCookie) return NextResponse.next();

  const url = new URL("/signin", req.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Anonymous users can run the dream ritual end-to-end on `/reflect`
    // (including /api/copilotkit and /api/transcribe). The sign-up gate
    // lives inside the takeaway screen — saving a session is what requires
    // an account, hence /api/sessions/* and /history/* are still protected
    // here. Public: /, /reflect, /signin, /signup, /api/auth/*,
    // /api/copilotkit/*, /api/transcribe/*, /api/takeaway-og/*, _next assets.
    "/history/:path*",
    "/api/sessions/:path*",
  ],
};
