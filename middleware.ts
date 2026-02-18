import { NextRequest, NextResponse } from "next/server";

const TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60;

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Generates an admin_token value: "<hmac>.<timestamp>"
 * HMAC is SHA-256 of the Unix timestamp string, keyed with ADMIN_SECRET.
 */
export async function generateAdminToken(secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex}.${timestamp}`;
}

/**
 * Validates an admin_token cookie value.
 * Returns true if the HMAC is valid and the token is not older than 24 hours.
 */
export async function validateAdminToken(token: string, secret: string): Promise<boolean> {
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

    // Decode stored HMAC hex back to bytes
    const hmacBytes = new Uint8Array(
      hmac.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const key = await importKey(secret);

    // crypto.subtle.verify performs a timing-safe comparison internally
    return crypto.subtle.verify(
      "HMAC",
      key,
      hmacBytes,
      new TextEncoder().encode(timestampStr)
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow unauthenticated access to the login page itself
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;
  const secret = process.env.ADMIN_SECRET ?? "";

  if (!token || !(await validateAdminToken(token, secret))) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl, { status: 307 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
