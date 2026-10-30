import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ip_locator_session";
export const SESSION_DAYS = 7;

/** The shared sign-in password; when unset the app stays locked. */
export function appPassword(): string | null {
  return process.env.APP_PASSWORD?.trim() || null;
}

function secret(): string | null {
  const password = appPassword();
  if (!password) return null;
  // Tie sessions to the password too, so changing it signs everyone out.
  return `${process.env.AUTH_SECRET ?? ""}:${password}`;
}

function sign(value: string, key: string): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function passwordMatches(input: string): boolean {
  const password = appPassword();
  if (!password) return false;
  // Compare digests so the check takes the same time whatever the input length.
  return safeEqual(sign(input, "compare"), sign(password, "compare"));
}

/** `<expiry ms>.<signature>` — stateless, so it survives server restarts. */
export function createSessionToken(now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const expires = String(now + SESSION_DAYS * 86_400_000);
  return `${expires}.${sign(expires, key)}`;
}

export function isValidSessionToken(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(signature, sign(expires, key));
}

/** Only same-site paths, so the login form can't be used to redirect elsewhere. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
