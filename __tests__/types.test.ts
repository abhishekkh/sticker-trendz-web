import type { Sticker, Order, DailyMetric, CartItem, CustomerData } from "@/types";

// Type-level tests: verify shapes compile correctly.
// These tests never actually run assertions — if they compile, the types are correct.

describe("Type definitions", () => {
  it("CartItem has required fields with correct types", () => {
    const item: CartItem = {
      stickerId: "uuid-123",
      title: "Cool Sticker",
      thumbnailUrl: "https://example.com/thumb.jpg",
      price: 4.49,
      quantity: 2,
    };
    expect(item.stickerId).toBe("uuid-123");
    expect(item.price).toBe(4.49);
    expect(item.quantity).toBe(2);
  });

  it("CartItem allows null thumbnailUrl", () => {
    const item: CartItem = {
      stickerId: "uuid-456",
      title: "Another Sticker",
      thumbnailUrl: null,
      price: 2.99,
      quantity: 1,
    };
    expect(item.thumbnailUrl).toBeNull();
  });

  it("DailyMetric has all required columns", () => {
    const metric: DailyMetric = {
      date: "2024-01-15T00:00:00Z",
      orders: 5,
      gross_revenue: 22.45,
      cogs: 10.0,
      etsy_fees: 2.25,
      estimated_profit: 10.2,
      new_listings: 3,
      avg_order_value: 4.49,
    };
    expect(metric.orders).toBe(5);
    expect(metric.gross_revenue).toBe(22.45);
  });

  it("Sticker pricing_tier is one of the four valid values", () => {
    const tiers: Sticker["current_pricing_tier"][] = [
      "just_dropped",
      "trending",
      "cooling",
      "evergreen",
    ];
    expect(tiers).toHaveLength(4);
  });

  it("Order has stripe_session_id field", () => {
    const order: Partial<Order> = {
      stripe_session_id: "cs_test_abc123",
      status: "pending",
    };
    expect(order.stripe_session_id).toBe("cs_test_abc123");
  });

  it("CustomerData has nested shipping_address", () => {
    const data: CustomerData = {
      name: "Jane Doe",
      email: "jane@example.com",
      shipping_address: {
        line1: "123 Main St",
        line2: null,
        city: "Chicago",
        state: "IL",
        postal_code: "60601",
        country: "US",
      },
    };
    expect(data.shipping_address.country).toBe("US");
    expect(data.shipping_address.line2).toBeNull();
  });
});
