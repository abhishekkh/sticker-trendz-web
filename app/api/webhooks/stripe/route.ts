import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase";
import type { CustomerData } from "@/types";

interface CartMetaItem {
  stickerId: string;
  quantity: number;
  unitPrice: number;
  fulfillmentProvider: string | null;
  pricingTier: string;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // Only handle checkout.session.completed events
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const sessionId = session.id;

  const supabase = createClient();

  // Idempotency check: if orders already exist for this session, skip
  const { data: existingOrders, error: checkError } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .limit(1);

  if (checkError) {
    console.error("Idempotency check failed:", checkError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (existingOrders && existingOrders.length > 0) {
    // Already processed — return 200 to acknowledge
    return NextResponse.json({ received: true });
  }

  // Parse cart metadata from session
  const cartMeta: CartMetaItem[] = (() => {
    try {
      return JSON.parse(session.metadata?.cart ?? "[]");
    } catch {
      return [];
    }
  })();

  if (cartMeta.length === 0) {
    console.error("No cart metadata found in session:", sessionId);
    return NextResponse.json({ error: "Missing cart metadata" }, { status: 400 });
  }

  // Build customer_data from Stripe session
  const customerDetails = session.customer_details;
  const shippingDetails = session.collected_information?.shipping_details;

  const customerData: CustomerData | null =
    customerDetails
      ? {
          name: shippingDetails?.name ?? customerDetails.name ?? "",
          email: customerDetails.email ?? "",
          shipping_address: {
            line1: shippingDetails?.address?.line1 ?? "",
            line2: shippingDetails?.address?.line2 ?? null,
            city: shippingDetails?.address?.city ?? "",
            state: shippingDetails?.address?.state ?? "",
            postal_code: shippingDetails?.address?.postal_code ?? "",
            country: shippingDetails?.address?.country ?? "",
          },
        }
      : null;

  // Build order rows — one per cart item
  const orderRows = cartMeta.map((item) => ({
    stripe_session_id: sessionId,
    sticker_id: item.stickerId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_amount: item.unitPrice * item.quantity,
    fulfillment_provider: item.fulfillmentProvider,
    status: "pending",
    pricing_tier_at_sale: item.pricingTier,
    customer_data: customerData,
  }));

  // Insert all order rows
  const { error: insertError } = await supabase.from("orders").insert(orderRows);

  if (insertError) {
    console.error("Failed to insert orders:", insertError);
    return NextResponse.json({ error: "Failed to write orders" }, { status: 500 });
  }

  // Increment sales_count for each sticker
  for (const item of cartMeta) {
    const { error: updateError } = await supabase.rpc("increment_sales_count", {
      p_sticker_id: item.stickerId,
      p_quantity: item.quantity,
    });

    if (updateError) {
      // Fall back to a read-then-update if RPC is not available
      console.warn(
        `RPC increment_sales_count unavailable for sticker ${item.stickerId}, using fallback:`,
        updateError.message
      );
      const { data: sticker } = await supabase
        .from("stickers")
        .select("sales_count")
        .eq("id", item.stickerId)
        .single();

      if (sticker !== null) {
        await supabase
          .from("stickers")
          .update({ sales_count: (sticker.sales_count ?? 0) + item.quantity })
          .eq("id", item.stickerId);
      }
    }
  }

  // Refresh daily_metrics materialized view — non-blocking
  supabase
    .rpc("refresh_daily_metrics")
    .then(({ error }) => {
      if (error) {
        // Try raw SQL refresh if no wrapper RPC exists
        supabase
          .from("daily_metrics")
          .select("*")
          .limit(0)
          .then(() => {
            // Intentionally fire-and-forget; best-effort only
          });
        console.warn("Could not refresh daily_metrics via RPC:", error.message);
      }
    });

  return NextResponse.json({ received: true });
}
