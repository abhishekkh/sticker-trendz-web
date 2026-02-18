/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock react-hot-toast
const mockToastError = jest.fn();
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: mockToastError },
}));

// Mock @/components/ui/button
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

// Mock @/lib/cart
const mockRemoveItem = jest.fn();
const mockUpdateQuantity = jest.fn();
jest.mock("@/lib/cart", () => ({ useCartStore: jest.fn() }));

import { CartDrawer } from "@/components/shop/CartDrawer";

const cartItems = [
  {
    stickerId: "sticker-1",
    title: "Cool Cat",
    thumbnailUrl: "https://example.com/cool-cat.jpg",
    price: 4.49,
    quantity: 2,
  },
  {
    stickerId: "sticker-2",
    title: "Space Dog",
    thumbnailUrl: null,
    price: 3.99,
    quantity: 1,
  },
];

function setupCartStore(items = cartItems) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/cart").useCartStore.mockReturnValue({
    items,
    removeItem: mockRemoveItem,
    updateQuantity: mockUpdateQuantity,
    cartTotal: jest.fn(() => 12.97),
  });
}

const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  setupCartStore();
  global.fetch = jest.fn();
});

describe("CartDrawer", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <CartDrawer isOpen={false} onClose={onClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog with 'Your Cart' heading when isOpen is true", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Your Cart")).toBeInTheDocument();
  });

  it("shows 'Your cart is empty' when items array is empty", () => {
    setupCartStore([]);
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("checkout button is disabled when cart is empty", () => {
    setupCartStore([]);
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const checkoutBtn = screen.getByText("Checkout");
    expect(checkoutBtn).toBeDisabled();
  });

  it("renders each item's title when cart has items", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText("Cool Cat")).toBeInTheDocument();
    expect(screen.getByText("Space Dog")).toBeInTheDocument();
  });

  it("renders unit price as '$4.49 each' for first item", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText("$4.49 each")).toBeInTheDocument();
  });

  it("renders line total '$8.98' for Cool Cat (4.49 x 2)", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText("$8.98")).toBeInTheDocument();
  });

  it("renders cart total '$12.97' in footer", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    expect(screen.getByText("$12.97")).toBeInTheDocument();
  });

  it("checkout button is NOT disabled when cart has items", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const checkoutBtn = screen.getByText("Checkout");
    expect(checkoutBtn).not.toBeDisabled();
  });

  it("clicking decrease quantity button calls updateQuantity with quantity - 1", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const decreaseBtn = screen.getByLabelText("Decrease quantity of Cool Cat");
    fireEvent.click(decreaseBtn);
    expect(mockUpdateQuantity).toHaveBeenCalledWith("sticker-1", 1); // 2 - 1
  });

  it("clicking increase quantity button calls updateQuantity with quantity + 1", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const increaseBtn = screen.getByLabelText("Increase quantity of Cool Cat");
    fireEvent.click(increaseBtn);
    expect(mockUpdateQuantity).toHaveBeenCalledWith("sticker-1", 3); // 2 + 1
  });

  it("clicking Remove for the first item calls removeItem with its stickerId", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const removeButtons = screen.getAllByText("Remove");
    fireEvent.click(removeButtons[0]);
    expect(mockRemoveItem).toHaveBeenCalledWith("sticker-1");
  });

  it("clicking close button calls onClose", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const closeBtn = screen.getByLabelText("Close cart");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking backdrop calls onClose", () => {
    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("successful checkout calls fetch with correct body and redirects to Stripe URL", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/pay/abc" }),
    });

    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const checkoutBtn = screen.getByText("Checkout");

    await act(async () => {
      fireEvent.click(checkoutBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/checkout",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({
            stickerId: i.stickerId,
            quantity: i.quantity,
          })),
        }),
      })
    );
    expect(mockPush).toHaveBeenCalledWith("https://checkout.stripe.com/pay/abc");
  });

  it("calls toast.error with error message when checkout API returns an error, and does NOT redirect", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Cart is empty" }),
    });

    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const checkoutBtn = screen.getByText("Checkout");

    await act(async () => {
      fireEvent.click(checkoutBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Cart is empty");
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("calls toast.error when fetch throws a network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const checkoutBtn = screen.getByText("Checkout");

    await act(async () => {
      fireEvent.click(checkoutBtn);
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Something went wrong. Please try again."
      );
    });
  });

  it("shows 'Processing...' while checkout is in flight", async () => {
    let resolveCheckout!: (value: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCheckout = resolve;
      })
    );

    render(<CartDrawer isOpen={true} onClose={onClose} />);
    const checkoutBtn = screen.getByText("Checkout");

    act(() => {
      fireEvent.click(checkoutBtn);
    });

    // While in-flight, button should show "Processing..."
    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });

    // Clean up: resolve the promise to avoid open handles
    await act(async () => {
      resolveCheckout({
        ok: true,
        json: async () => ({ url: "https://checkout.stripe.com/pay/xyz" }),
      });
    });
  });
});
