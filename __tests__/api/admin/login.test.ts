// Mock next/server and middleware before importing the route handler
jest.mock("next/server", () => {
  const cookieStore: Record<string, { value: string; options: unknown }> = {};

  class MockResponse {
    status: number;
    body: unknown;
    cookies = {
      set: jest.fn(
        (name: string, value: string, options: unknown) => {
          cookieStore[name] = { value, options };
        }
      ),
    };
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    async json() {
      return this.body;
    }
    static __cookieStore = cookieStore;
  }

  const NextResponse = {
    json: jest.fn((body: unknown, init?: { status?: number }) => {
      return new MockResponse(body, init);
    }),
    __cookieStore: cookieStore,
  };

  class MockRequest {
    private _body: unknown;
    constructor(_url: string, init?: { body?: string }) {
      try {
        this._body = init?.body ? JSON.parse(init.body) : {};
      } catch {
        this._body = null;
      }
    }
    async json() {
      if (this._body === null) throw new Error("Invalid JSON");
      return this._body;
    }
  }

  return { NextResponse, NextRequest: MockRequest };
});

jest.mock("@/middleware", () => ({
  generateAdminToken: jest.fn(() => "mocked-hmac.1234567890"),
  validateAdminToken: jest.fn(() => true),
}));

import { POST, GET } from "@/app/api/admin/login/route";

const ADMIN_SECRET = "test-admin-secret";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextRequest, NextResponse } = require("next/server");

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_SECRET = ADMIN_SECRET;
  process.env.NODE_ENV = "test";
  // Reset cookie store
  Object.keys(NextResponse.__cookieStore).forEach(
    (k) => delete NextResponse.__cookieStore[k]
  );
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/login", {
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/login", () => {
  it("returns 200 and sets admin_token cookie on correct password", async () => {
    const req = makeRequest({ password: ADMIN_SECRET });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(res.cookies.set).toHaveBeenCalledWith(
      "admin_token",
      "mocked-hmac.1234567890",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" })
    );
  });

  it("returns 401 and does NOT set cookie on wrong password", async () => {
    const req = makeRequest({ password: "wrong-password" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid password" });
    expect(res.cookies.set).not.toHaveBeenCalled();
  });

  it("returns 400 when password field is missing", async () => {
    const req = makeRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Password required" });
  });

  it("returns 400 on invalid JSON body", async () => {
    // Craft a request with non-JSON body
    const mockReq = {
      json: async () => {
        throw new Error("Invalid JSON");
      },
    };
    const res = await POST(mockReq as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it("cookie has maxAge of 24 hours (86400 seconds)", async () => {
    const req = makeRequest({ password: ADMIN_SECRET });
    const res = await POST(req);

    expect(res.cookies.set).toHaveBeenCalledWith(
      "admin_token",
      expect.any(String),
      expect.objectContaining({ maxAge: 86400 })
    );
  });
});

describe("GET /api/admin/login", () => {
  it("returns 405 Method Not Allowed", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body).toEqual({ error: "Method not allowed" });
  });
});
