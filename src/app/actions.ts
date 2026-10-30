"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, isValidSessionToken, passwordMatches, safeNext, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { extractIps, MAX_IPS } from "@/lib/ip-geo";

export type LoginState = { error: string | null };

// Per-address attempt counter (single server process), to slow down password guessing.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await clientIp();
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    return { error: "Too many attempts. Wait 15 minutes and try again." };
  }
  const token = passwordMatches(String(formData.get("password") ?? "")) ? createSessionToken() : null;
  if (!token) {
    const fresh = !entry || entry.resetAt <= now;
    attempts.set(ip, { count: fresh ? 1 : entry.count + 1, resetAt: fresh ? now + WINDOW_MS : entry.resetAt });
    if (attempts.size > 10_000) attempts.clear();
    return { error: "That password isn't right." };
  }
  attempts.delete(ip);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

async function assertSignedIn() {
  if (!isValidSessionToken((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/login");
}

/**
 * Scans pasted text (a list of addresses or raw logs) for IPs and sends the
 * page to a shareable URL holding just the addresses, which it then locates.
 */
export async function scanIps(formData: FormData): Promise<void> {
  await assertSignedIn();
  const found = extractIps(String(formData.get("text") ?? ""));
  if (found.length === 0) redirect("/?empty=1");
  const params = new URLSearchParams({ ips: found.slice(0, MAX_IPS).join(",") });
  if (found.length > MAX_IPS) params.set("skipped", String(found.length - MAX_IPS));
  redirect(`/?${params}`);
}
