// Mock next/server before importing proxy (uses Web API Request not available in Node)
jest.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: { next: jest.fn(), redirect: jest.fn() },
}));

import { generateAdminToken, validateAdminToken } from "@/proxy";
import { createHmac } from "crypto";

const SECRET = "super-secret-admin-password";

describe("generateAdminToken", () => {
  it("generates a token in the format <hmac>.<timestamp>", () => {
    const token = generateAdminToken(SECRET);
    expect(token).toMatch(/^[a-f0-9]{64}\.\d+$/);
  });

  it("uses a recent timestamp", () => {
    const before = Math.floor(Date.now() / 1000);
    const token = generateAdminToken(SECRET);
    const after = Math.floor(Date.now() / 1000);

    const timestamp = parseInt(token.split(".").pop()!, 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});

describe("validateAdminToken", () => {
  it("accepts a freshly generated token", () => {
    const token = generateAdminToken(SECRET);
    expect(validateAdminToken(token, SECRET)).toBe(true);
  });

  it("rejects an expired token (older than 24h)", () => {
    const expiredTimestamp = (
      Math.floor(Date.now() / 1000) -
      25 * 60 * 60
    ).toString(); // 25 hours ago
    const hmac = createHmac("sha256", SECRET)
      .update(expiredTimestamp)
      .digest("hex");
    const expiredToken = `${hmac}.${expiredTimestamp}`;
    expect(validateAdminToken(expiredToken, SECRET)).toBe(false);
  });

  it("rejects a tampered HMAC", () => {
    const token = generateAdminToken(SECRET);
    const [, timestamp] = token.split(".");
    const tamperedToken = `deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef.${timestamp}`;
    expect(validateAdminToken(tamperedToken, SECRET)).toBe(false);
  });

  it("rejects a token with a wrong secret", () => {
    const token = generateAdminToken("wrong-secret");
    expect(validateAdminToken(token, SECRET)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateAdminToken("", SECRET)).toBe(false);
  });

  it("rejects a token with no dot separator", () => {
    expect(validateAdminToken("nodothere", SECRET)).toBe(false);
  });

  it("rejects a token with non-numeric timestamp", () => {
    const hmac = createHmac("sha256", SECRET).update("notanumber").digest("hex");
    expect(validateAdminToken(`${hmac}.notanumber`, SECRET)).toBe(false);
  });

  it("rejects a token that is exactly 24h old (boundary)", () => {
    const boundaryTimestamp = (
      Math.floor(Date.now() / 1000) -
      24 * 60 * 60 -
      1
    ).toString();
    const hmac = createHmac("sha256", SECRET)
      .update(boundaryTimestamp)
      .digest("hex");
    const boundaryToken = `${hmac}.${boundaryTimestamp}`;
    expect(validateAdminToken(boundaryToken, SECRET)).toBe(false);
  });
});
