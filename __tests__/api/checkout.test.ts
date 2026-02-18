// Mock next/server before importing the route handler
jest.mock("next/server", () => {
  class MockResponse {
    status: number;
    body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    async json() {
      return this.body;
    }
  }

  const NextResponse = {
    json: jest.fn((body: unknown, init?: { status?: number }) => {
      return new MockResponse(body, init);
    }),
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

// Mock Supabase — must be hoisted variables (mock prefix)
const mockIn = jest.fn();
const mockCheckoutSelect = jest.fn(() => ({ in: mockIn }));
const mockCheckoutFrom = jest.fn(() => ({ select: mockCheckoutSelect }));
jest.mock("@/lib/supabase", () => ({
  createClient: jest.fn(() => ({ from: mockCheckoutFrom })),
}));

// Mock stripe lib
const mockCreateCheckoutSession = jest.fn();
jest.mock("@/lib/stripe", () => ({
  createCheckoutSession: mockCreateCheckoutSession,
}));

import { POST, GET } from "@/app/api/checkout/route";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextRequest } = require("next/server");

const sampleStickers = [
  {
    id: "sticker-1",
    title: "Cool Cat",
    image_url: "https://r2.example.com/cool-cat.png",
    price: 4.49,
    current_pricing_tier: "just_dropped",
    fulfillment_provider: "sticker_mule",
    published_at: "2024-01-01T00:00:00Z",
    moderation_status: "approved",
  },
  {
    id: "sticker-2",
    title: "Space Dog",
    image_url: "https://r2.example.com/space-dog.png",
    price: 3.99,
    current_pricing_tier: "trending",
    fulfillment_provider: "self_usps",
    published_at: "2024-01-02T00:00:00Z",
    moderation_status: "approved",
  },
];

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/checkout", {
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest() {
  return {
    json: async () => {
      throw new Error("Invalid JSON");
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/checkout", () => {
  it("returns 400 with 'Cart is empty' for empty items array", async () => {
    const req = makeRequest({ items: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cart is empty");
  });

  it("returns 400 with 'Cart is empty' when items field is missing", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cart is empty");
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = makeInvalidJsonRequest();
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
  });

  it("returns 400 when sticker ID is not found in DB", async () => {
    mockIn.mockResolvedValueOnce({ data: [sampleStickers[0]], error: null });

    const req = makeRequest({
      items: [
        { stickerId: "sticker-1", quantity: 1 },
        { stickerId: "sticker-missing", quantity: 1 },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("sticker-missing");
  });

  it("returns 400 when sticker has published_at: null", async () => {
    const unpublishedSticker = {
      ...sampleStickers[0],
      published_at: null,
    };
    mockIn.mockResolvedValueOnce({ data: [unpublishedSticker], error: null });

    const req = makeRequest({ items: [{ stickerId: "sticker-1", quantity: 1 }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Cool Cat");
  });

  it("returns 400 when sticker has moderation_status: 'pending'", async () => {
    const pendingSticker = {
      ...sampleStickers[0],
      moderation_status: "pending",
    };
    mockIn.mockResolvedValueOnce({ data: [pendingSticker], error: null });

    const req = makeRequest({ items: [{ stickerId: "sticker-1", quantity: 1 }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Cool Cat");
  });

  it("uses DB prices (not client prices) and returns 200 with Stripe session URL", async () => {
    mockIn.mockResolvedValueOnce({ data: [sampleStickers[0]], error: null });
    mockCreateCheckoutSession.mockResolvedValueOnce(
      "https://checkout.stripe.com/pay/abc"
    );

    const req = makeRequest({
      items: [{ stickerId: "sticker-1", quantity: 2 }],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/pay/abc");

    // Verify DB price used, not a client-supplied price
    const callArgs = mockCreateCheckoutSession.mock.calls[0][0];
    expect(callArgs[0].unitPrice).toBe(4.49); // DB price
  });

  it("passes all items to createCheckoutSession for a multi-item cart", async () => {
    mockIn.mockResolvedValueOnce({ data: sampleStickers, error: null });
    mockCreateCheckoutSession.mockResolvedValueOnce(
      "https://checkout.stripe.com/pay/multi"
    );

    const req = makeRequest({
      items: [
        { stickerId: "sticker-1", quantity: 2 },
        { stickerId: "sticker-2", quantity: 1 },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const callArgs = mockCreateCheckoutSession.mock.calls[0][0];
    expect(callArgs).toHaveLength(2);
  });

  it("passes correct args to createCheckoutSession including all required fields", async () => {
    mockIn.mockResolvedValueOnce({ data: [sampleStickers[0]], error: null });
    mockCreateCheckoutSession.mockResolvedValueOnce(
      "https://checkout.stripe.com/pay/xyz"
    );

    const req = makeRequest({
      items: [{ stickerId: "sticker-1", quantity: 3 }],
    });
    await POST(req);

    const callArgs = mockCreateCheckoutSession.mock.calls[0][0];
    expect(callArgs[0]).toMatchObject({
      stickerId: "sticker-1",
      title: "Cool Cat",
      imageUrl: "https://r2.example.com/cool-cat.png",
      unitPrice: 4.49,
      quantity: 3,
      fulfillmentProvider: "sticker_mule",
      pricingTier: "just_dropped",
    });
  });

  it("returns 500 on Supabase error", async () => {
    mockIn.mockResolvedValueOnce({
      data: null,
      error: { message: "DB connection failed" },
    });

    const req = makeRequest({ items: [{ stickerId: "sticker-1", quantity: 1 }] });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 500 when createCheckoutSession throws", async () => {
    mockIn.mockResolvedValueOnce({ data: [sampleStickers[0]], error: null });
    mockCreateCheckoutSession.mockRejectedValueOnce(
      new Error("Stripe unavailable")
    );

    const req = makeRequest({ items: [{ stickerId: "sticker-1", quantity: 1 }] });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/checkout", () => {
  it("returns 405 Method Not Allowed", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toBe("Method not allowed");
  });
});
