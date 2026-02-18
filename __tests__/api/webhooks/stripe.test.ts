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

  return { NextResponse, NextRequest: class {} };
});

// Mock @/lib/stripe — expose stripe.webhooks.constructEvent
const mockConstructEvent = jest.fn();
jest.mock("@/lib/stripe", () => ({
  stripe: { webhooks: { constructEvent: mockConstructEvent } },
}));

// Mock @/lib/supabase with separate jest.fn() for each operation (mock prefix required)
const mockWebhookLimit = jest.fn();
const mockWebhookEq = jest.fn(() => ({ limit: mockWebhookLimit }));
const mockWebhookOrdersSelect = jest.fn(() => ({ eq: mockWebhookEq }));
const mockWebhookInsert = jest.fn();
const mockWebhookRpc = jest.fn(() => Promise.resolve({ error: null }));
const mockWebhookFrom = jest.fn(() => ({
  select: mockWebhookOrdersSelect,
  insert: mockWebhookInsert,
}));
jest.mock("@/lib/supabase", () => ({
  createClient: jest.fn(() => ({ from: mockWebhookFrom, rpc: mockWebhookRpc })),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

// Helper: build a fake request object (not a real NextRequest)
function makeRequest(body: string, signature: string | null = "valid-sig") {
  return {
    text: async () => body,
    headers: {
      get: (name: string) =>
        name === "stripe-signature" ? signature : null,
    },
  };
}

// Helper: build a fake Stripe checkout.session.completed event
function makeCheckoutEvent(sessionId: string, cartItems: unknown[]) {
  return {
    type: "checkout.session.completed",
    data: {
      object: makeSession(sessionId, cartItems),
    },
  };
}

function makeSession(sessionId: string, cartItems: unknown[]) {
  return {
    id: sessionId,
    metadata: { cart: JSON.stringify(cartItems) },
    customer_details: { name: "Jane Doe", email: "jane@example.com" },
    collected_information: {
      shipping_details: {
        name: "Jane Doe",
        address: {
          line1: "123 Main St",
          line2: null,
          city: "Chicago",
          state: "IL",
          postal_code: "60601",
          country: "US",
        },
      },
    },
  };
}

const sampleCart = [
  {
    stickerId: "sticker-1",
    quantity: 2,
    unitPrice: 4.49,
    fulfillmentProvider: "sticker_mule",
    pricingTier: "just_dropped",
  },
  {
    stickerId: "sticker-2",
    quantity: 1,
    unitPrice: 3.99,
    fulfillmentProvider: "self_usps",
    pricingTier: "trending",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  // Default: no existing orders found (idempotency check passes)
  mockWebhookLimit.mockResolvedValue({ data: [], error: null });
  // Default: insert succeeds
  mockWebhookInsert.mockResolvedValue({ error: null });
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const req = makeRequest("rawbody", null);
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("stripe-signature");
  });

  it("returns 400 when constructEvent throws (invalid signature)", async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error("Signature verification failed");
    });
    const req = makeRequest("rawbody", "bad-sig");
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 200 and makes no Supabase calls when event type is not checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: "payment_intent.succeeded",
      data: { object: {} },
    });
    const req = makeRequest("rawbody");
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);
    expect(mockWebhookInsert).not.toHaveBeenCalled();
    expect(mockWebhookFrom).not.toHaveBeenCalled();
  });

  it("returns 200 and does NOT insert orders when session already exists (idempotency)", async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent("session-existing", sampleCart)
    );
    // Simulate existing orders found
    mockWebhookLimit.mockResolvedValueOnce({
      data: [{ id: "order-existing" }],
      error: null,
    });

    const req = makeRequest("rawbody");
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(200);
    expect(mockWebhookInsert).not.toHaveBeenCalled();
  });

  it("calls insert once with an array of 2 rows for a 2-item cart", async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent("session-new", sampleCart)
    );

    const req = makeRequest("rawbody");
    await POST(req as Parameters<typeof POST>[0]);

    expect(mockWebhookInsert).toHaveBeenCalledTimes(1);
    const insertedRows = mockWebhookInsert.mock.calls[0][0];
    expect(insertedRows).toHaveLength(2);
  });

  it("all inserted rows share the same stripe_session_id", async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent("session-abc", sampleCart)
    );

    const req = makeRequest("rawbody");
    await POST(req as Parameters<typeof POST>[0]);

    const insertedRows = mockWebhookInsert.mock.calls[0][0];
    for (const row of insertedRows) {
      expect(row.stripe_session_id).toBe("session-abc");
    }
  });

  it("first inserted row has correct fields", async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent("session-xyz", sampleCart)
    );

    const req = makeRequest("rawbody");
    await POST(req as Parameters<typeof POST>[0]);

    const insertedRows = mockWebhookInsert.mock.calls[0][0];
    expect(insertedRows[0]).toMatchObject({
      stripe_session_id: "session-xyz",
      sticker_id: "sticker-1",
      quantity: 2,
      unit_price: 4.49,
      total_amount: 8.98,
      fulfillment_provider: "sticker_mule",
      status: "pending",
      pricing_tier_at_sale: "just_dropped",
    });
  });

  it("returns 400 when cart metadata is an empty array", async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent("session-empty-cart", [])
    );

    const req = makeRequest("rawbody");
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 500 when insert returns an error", async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent("session-insert-fail", sampleCart)
    );
    mockWebhookInsert.mockResolvedValueOnce({ error: { message: "DB write failed" } });

    const req = makeRequest("rawbody");
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
  });

  it("returns 500 when idempotency check returns an error", async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent("session-check-fail", sampleCart)
    );
    mockWebhookLimit.mockResolvedValueOnce({
      data: null,
      error: { message: "DB read failed" },
    });

    const req = makeRequest("rawbody");
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
  });

  it("calls increment_sales_count rpc once per cart item", async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent("session-rpc", sampleCart)
    );

    const req = makeRequest("rawbody");
    await POST(req as Parameters<typeof POST>[0]);

    // rpc is called for increment_sales_count once per cart item (2 items)
    // plus potentially refresh_daily_metrics (non-blocking, may be called too)
    const incrementCalls = mockWebhookRpc.mock.calls.filter(
      (call) => call[0] === "increment_sales_count"
    );
    expect(incrementCalls).toHaveLength(sampleCart.length);
  });
});
