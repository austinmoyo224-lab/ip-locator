import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, isValidSessionToken, passwordMatches, safeNext } from "./auth";

beforeEach(() => {
  process.env.APP_PASSWORD = "correct horse";
  process.env.AUTH_SECRET = "test-secret";
});
afterEach(() => {
  delete process.env.APP_PASSWORD;
  delete process.env.AUTH_SECRET;
});

describe("passwordMatches", () => {
  it("accepts only the configured password", () => {
    expect(passwordMatches("correct horse")).toBe(true);
    expect(passwordMatches("correct horse ")).toBe(false);
    expect(passwordMatches("")).toBe(false);
  });

  it("locks everything when no password is set", () => {
    delete process.env.APP_PASSWORD;
    expect(passwordMatches("")).toBe(false);
    expect(createSessionToken()).toBeNull();
  });
});

describe("session tokens", () => {
  it("round-trips and expires", () => {
    const now = Date.UTC(2026, 9, 30);
    const token = createSessionToken(now)!;
    expect(isValidSessionToken(token, now)).toBe(true);
    expect(isValidSessionToken(token, now + 8 * 86_400_000)).toBe(false);
  });

  it("rejects tampered tokens and tokens from an old password", () => {
    const token = createSessionToken()!;
    const [expires, sig] = token.split(".");
    expect(isValidSessionToken(`${Number(expires) + 1}.${sig}`)).toBe(false);
    expect(isValidSessionToken("garbage")).toBe(false);
    expect(isValidSessionToken(undefined)).toBe(false);
    process.env.APP_PASSWORD = "new password";
    expect(isValidSessionToken(token)).toBe(false);
  });
});

describe("safeNext", () => {
  it("keeps same-site paths only", () => {
    expect(safeNext("/?ips=1.1.1.1")).toBe("/?ips=1.1.1.1");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
