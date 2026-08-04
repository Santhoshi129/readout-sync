import { NextRequest, NextResponse } from "next/server";

/**
 * Shared guard for the daily cron routes.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
 * set on the project. If it isn't set, the routes stay open — they're
 * read-only and idempotent, but setting CRON_SECRET is recommended so the
 * endpoints can't be hit repeatedly by anyone who finds the URL.
 *
 * Returns a response to send when the request should be rejected, or null
 * when the request is allowed to proceed.
 */
export function authorizeCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return null;

  // Allows a manual run from a browser without exposing the header.
  const key = req.nextUrl.searchParams.get("key");
  if (key && key === secret) return null;

  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
