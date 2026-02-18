/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Sticker } from "@/types";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock TierBadge
jest.mock("@/components/shop/TierBadge", () => ({
  TierBadge: ({ tier }: { tier: string }) => (
    <span data-testid="tier-badge">{tier}</span>
  ),
}));

// Mock Button
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    size,
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    size?: string;
  }) => (
    <button onClick={onClick} data-size={size}>
      {children}
    </button>
  ),
}));

// Mock useCartStore — selector pattern
const mockAddItem = jest.fn();
jest.mock("@/lib/cart", () => ({
  useCartStore: jest.fn(
    (selector: (s: { addItem: jest.Mock }) => unknown) =>
      selector({ addItem: mockAddItem })
  ),
}));

import { StickerCard } from "@/components/shop/StickerCard";

const sticker: Sticker = {
  id: "sticker-abc",
  trend_id: null,
  title: "Cool Cat",
  description: "A cool cat sticker",
  image_url: "https://r2.example.com/cool-cat.png",
  thumbnail_url: "https://r2.example.com/cool-cat-thumb.png",
  original_url: null,
  size: "3in",
  generation_prompt: null,
  generation_model: null,
  generation_model_version: null,
  moderation_status: "approved",
  moderation_score: null,
  moderation_categories: null,
  etsy_listing_id: null,
  price: 4.49,
  current_pricing_tier: "just_dropped",
  floor_price: null,
  base_cost: null,
  shipping_cost: null,
  packaging_cost: null,
  fulfillment_provider: "sticker_mule",
  tags: null,
  sales_count: 5,
  view_count: 10,
  last_sale_at: null,
  created_at: "2024-01-01T00:00:00Z",
  published_at: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("StickerCard", () => {
  it("renders the sticker title", () => {
    render(<StickerCard sticker={sticker} />);
    expect(screen.getByText("Cool Cat")).toBeInTheDocument();
  });

  it("renders the formatted price '$4.49'", () => {
    render(<StickerCard sticker={sticker} />);
    expect(screen.getByText("$4.49")).toBeInTheDocument();
  });

  it("renders TierBadge with the correct tier", () => {
    render(<StickerCard sticker={sticker} />);
    const badge = screen.getByTestId("tier-badge");
    expect(badge).toHaveTextContent("just_dropped");
  });

  it("both links have href='/stickers/sticker-abc'", () => {
    render(<StickerCard sticker={sticker} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/stickers/sticker-abc");
    }
  });

  it("clicking 'Add to Cart' calls addItem with correct arguments", () => {
    render(<StickerCard sticker={sticker} />);
    fireEvent.click(screen.getByText("Add to Cart"));
    expect(mockAddItem).toHaveBeenCalledTimes(1);
    expect(mockAddItem).toHaveBeenCalledWith({
      stickerId: "sticker-abc",
      title: "Cool Cat",
      thumbnailUrl: "https://r2.example.com/cool-cat-thumb.png",
      price: 4.49,
    });
  });

  it("image src is thumbnail_url when it is set", () => {
    render(<StickerCard sticker={sticker} />);
    const img = screen.getByAltText("Cool Cat");
    expect(img).toHaveAttribute(
      "src",
      "https://r2.example.com/cool-cat-thumb.png"
    );
  });

  it("image src falls back to image_url when thumbnail_url is null", () => {
    const noThumbSticker: Sticker = {
      ...sticker,
      thumbnail_url: null,
    };
    render(<StickerCard sticker={noThumbSticker} />);
    const img = screen.getByAltText("Cool Cat");
    expect(img).toHaveAttribute("src", "https://r2.example.com/cool-cat.png");
  });
});
