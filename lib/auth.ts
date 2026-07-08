// lib/auth.ts — Edge-compatible signed session cookie.
export const COOKIE_NAME = "twu_readout_session";
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64url(sig);
}

export async function sign(): Promise<string> {
  const payload = `ok.${Date.now()}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verify(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = await hmac(payload);
  if (sig !== expected) return false;
  const ts = Number(payload.split(".")[1]);
  if (!Number.isFinite(ts)) return false;
  // 30-day validity
  return Date.now() - ts < 30 * 24 * 60 * 60 * 1000;
}
