import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60;

/**
 * Generates an admin_token value: "<hmac>.<timestamp>"
 * HMAC is SHA-256 of the Unix timestamp string, keyed with ADMIN_SECRET.
 */
export function generateAdminToken(secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const hmac = createHmac("sha256", secret).update(timestamp).digest("hex");
  return `${hmac}.${timestamp}`;
}

/**
 * Validates an admin_token cookie value.
 * Returns true if the HMAC is valid and the token is not older than 24 hours.
 */
export function validateAdminToken(token: string, secret: string): boolean {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return false;

    const hmac = token.slice(0, dotIndex);
    const timestampStr = token.slice(dotIndex + 1);
    if (!hmac || !timestampStr) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > TOKEN_MAX_AGE_SECONDS) return false;

    const expected = createHmac("sha256", secret).update(timestampStr).digest();
    const actual = Buffer.from(hmac, "hex");

    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow unauthenticated access to the login page itself
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;
  const secret = process.env.ADMIN_SECRET ?? "";

  if (!token || !validateAdminToken(token, secret)) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl, { status: 307 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
