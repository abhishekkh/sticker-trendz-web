import { createCheckoutSession, CheckoutItem } from "@/lib/stripe";

// Mock the stripe module
jest.mock("stripe", () => {
  const mockCreate = jest.fn();
  const MockStripe = jest.fn(() => ({
    checkout: {
      sessions: {
        create: mockCreate,
      },
    },
  }));
  (MockStripe as unknown as Record<string, unknown>).__mockCreate = mockCreate;
  return MockStripe;
});

const getMockCreate = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require("stripe");
  return Stripe.__mockCreate as jest.Mock;
};

const sampleItems: CheckoutItem[] = [
  {
    stickerId: "sticker-1",
    title: "Cool Cat",
    imageUrl: "https://r2.example.com/cool-cat.png",
    unitPrice: 4.49,
    quantity: 2,
    fulfillmentProvider: "sticker_mule",
    pricingTier: "just_dropped",
  },
  {
    stickerId: "sticker-2",
    title: "Space Dog",
    imageUrl: null,
    unitPrice: 3.99,
    quantity: 1,
    fulfillmentProvider: "self_usps",
    pricingTier: "trending",
  },
];

describe("createCheckoutSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.NEXT_PUBLIC_BASE_URL = "https://stickertrendz.com";
  });

  it("creates a session with correct line items", async () => {
    const mockCreate = getMockCreate();
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/session/abc123",
    });

    await createCheckoutSession(sampleItems);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];

    expect(call.line_items).toHaveLength(2);
    expect(call.line_items[0].price_data.unit_amount).toBe(449); // $4.49 → cents
    expect(call.line_items[0].price_data.product_data.name).toBe("Cool Cat");
    expect(call.line_items[0].price_data.product_data.images).toEqual([
      "https://r2.example.com/cool-cat.png",
    ]);
    expect(call.line_items[1].price_data.unit_amount).toBe(399); // $3.99 → cents
    expect(call.line_items[1].price_data.product_data.images).toEqual([]);
  });

  it("sets mode to payment", async () => {
    const mockCreate = getMockCreate();
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/session/abc123",
    });

    await createCheckoutSession(sampleItems);

    const call = mockCreate.mock.calls[0][0];
    expect(call.mode).toBe("payment");
  });

  it("restricts shipping to US only", async () => {
    const mockCreate = getMockCreate();
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/session/abc123",
    });

    await createCheckoutSession(sampleItems);

    const call = mockCreate.mock.calls[0][0];
    expect(call.shipping_address_collection.allowed_countries).toEqual(["US"]);
  });

  it("sets success and cancel URLs from NEXT_PUBLIC_BASE_URL", async () => {
    const mockCreate = getMockCreate();
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/session/abc123",
    });

    await createCheckoutSession(sampleItems);

    const call = mockCreate.mock.calls[0][0];
    expect(call.success_url).toContain(
      "https://stickertrendz.com/checkout/success"
    );
    expect(call.cancel_url).toBe("https://stickertrendz.com/");
  });

  it("serializes cart metadata with stickerId, quantity, unitPrice, pricingTier", async () => {
    const mockCreate = getMockCreate();
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/session/abc123",
    });

    await createCheckoutSession(sampleItems);

    const call = mockCreate.mock.calls[0][0];
    const cart = JSON.parse(call.metadata.cart);
    expect(cart).toHaveLength(2);
    expect(cart[0]).toMatchObject({
      stickerId: "sticker-1",
      quantity: 2,
      unitPrice: 4.49,
      pricingTier: "just_dropped",
      fulfillmentProvider: "sticker_mule",
    });
  });

  it("returns the session URL", async () => {
    const mockCreate = getMockCreate();
    mockCreate.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/session/xyz789",
    });

    const url = await createCheckoutSession(sampleItems);
    expect(url).toBe("https://checkout.stripe.com/session/xyz789");
  });

  it("throws if session URL is null", async () => {
    const mockCreate = getMockCreate();
    mockCreate.mockResolvedValueOnce({ url: null });

    await expect(createCheckoutSession(sampleItems)).rejects.toThrow(
      "Stripe session URL is null"
    );
  });
});
