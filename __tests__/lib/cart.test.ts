/**
 * @jest-environment jsdom
 */
import { act } from "@testing-library/react";

// Mock zustand persist to avoid localStorage in tests
jest.mock("zustand/middleware", () => ({
  persist: (fn: unknown) => fn,
}));

// Import after mock is set up
import { useCartStore } from "@/lib/cart";

const sampleItem = {
  stickerId: "sticker-1",
  title: "Cool Cat",
  thumbnailUrl: "https://example.com/thumb.jpg",
  price: 4.49,
};

const anotherItem = {
  stickerId: "sticker-2",
  title: "Space Dog",
  thumbnailUrl: null,
  price: 3.99,
};

beforeEach(() => {
  act(() => {
    useCartStore.getState().clearCart();
  });
});

describe("useCartStore", () => {
  describe("addItem", () => {
    it("adds a new item with quantity 1", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
      });
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].stickerId).toBe("sticker-1");
      expect(items[0].quantity).toBe(1);
    });

    it("increments quantity when adding an existing item", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().addItem(sampleItem);
      });
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it("adds multiple different items", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().addItem(anotherItem);
      });
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe("removeItem", () => {
    it("removes an item by stickerId", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().addItem(anotherItem);
        useCartStore.getState().removeItem("sticker-1");
      });
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].stickerId).toBe("sticker-2");
    });

    it("is a no-op for non-existent stickerId", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().removeItem("non-existent");
      });
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe("updateQuantity", () => {
    it("updates the quantity of an existing item", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().updateQuantity("sticker-1", 5);
      });
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("removes the item when quantity is set to 0", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().updateQuantity("sticker-1", 0);
      });
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("removes the item when quantity is negative", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().updateQuantity("sticker-1", -2);
      });
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("clearCart", () => {
    it("empties the cart", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().addItem(anotherItem);
        useCartStore.getState().clearCart();
      });
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("cartTotal", () => {
    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().cartTotal()).toBe(0);
    });

    it("calculates total as sum of price * quantity", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem); // $4.49 × 1
        useCartStore.getState().addItem(sampleItem); // quantity → 2
        useCartStore.getState().addItem(anotherItem); // $3.99 × 1
      });
      // $4.49 * 2 + $3.99 * 1 = $12.97
      expect(useCartStore.getState().cartTotal()).toBe(12.97);
    });

    it("rounds to 2 decimal places", () => {
      act(() => {
        // Add a sticker with price that creates floating point drift
        useCartStore.getState().addItem({
          ...sampleItem,
          price: 1.1,
        });
        useCartStore.getState().addItem({ ...sampleItem, price: 1.1 });
        useCartStore.getState().addItem({ ...sampleItem, price: 1.1 });
      });
      // 1.1 * 3 = 3.3 (floating point might give 3.3000000000000003)
      expect(useCartStore.getState().cartTotal()).toBe(3.3);
    });
  });

  describe("itemCount", () => {
    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().itemCount()).toBe(0);
    });

    it("sums quantities across all items", () => {
      act(() => {
        useCartStore.getState().addItem(sampleItem);
        useCartStore.getState().addItem(sampleItem); // quantity → 2
        useCartStore.getState().addItem(anotherItem); // quantity 1
      });
      expect(useCartStore.getState().itemCount()).toBe(3);
    });
  });
});
