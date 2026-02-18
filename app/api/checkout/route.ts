import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createCheckoutSession } from "@/lib/stripe";
import type { Sticker } from "@/types";

interface CheckoutRequestItem {
  stickerId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  let body: { items?: CheckoutRequestItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const items = body.items;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const stickerIds = items.map((item) => item.stickerId);

  const supabase = createClient();
  const { data: stickers, error } = await supabase
    .from("stickers")
    .select("id, title, image_url, price, current_pricing_tier, fulfillment_provider, published_at, moderation_status")
    .in("id", stickerIds);

  if (error) {
    console.error("Supabase fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch sticker data" }, { status: 500 });
  }

  // Check for sticker IDs not found in DB
  const foundIds = new Set((stickers ?? []).map((s) => s.id));
  const invalidIds = stickerIds.filter((id) => !foundIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Invalid sticker IDs: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  // Check that all stickers are published and approved
  const unavailable = (stickers as Pick<Sticker, "id" | "title" | "published_at" | "moderation_status">[]).filter(
    (s) => !s.published_at || s.moderation_status !== "approved"
  );
  if (unavailable.length > 0) {
    const titles = unavailable.map((s) => s.title).join(", ");
    return NextResponse.json(
      { error: `The following items are no longer available: ${titles}` },
      { status: 400 }
    );
  }

  // Build checkout items using DB prices (ignore client-supplied prices)
  const stickerMap = new Map(
    (stickers as Pick<Sticker, "id" | "title" | "image_url" | "price" | "current_pricing_tier" | "fulfillment_provider">[]).map((s) => [s.id, s])
  );

  const checkoutItems = items.map((item) => {
    const sticker = stickerMap.get(item.stickerId)!;
    return {
      stickerId: sticker.id,
      title: sticker.title,
      imageUrl: sticker.image_url,
      unitPrice: sticker.price,
      quantity: item.quantity,
      fulfillmentProvider: sticker.fulfillment_provider,
      pricingTier: sticker.current_pricing_tier,
    };
  });

  try {
    const sessionUrl = await createCheckoutSession(checkoutItems);
    return NextResponse.json({ url: sessionUrl });
  } catch (err) {
    console.error("Stripe session creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
