import Stripe from "stripe";

// Server-only: uses STRIPE_SECRET_KEY. Never import in client components.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export interface CheckoutItem {
  stickerId: string;
  title: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  fulfillmentProvider: string | null;
  pricingTier: string;
}

export async function createCheckoutSession(
  items: CheckoutItem[]
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
    (item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: item.imageUrl ? [item.imageUrl] : [],
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    })
  );

  const cartMeta = items.map((item) => ({
    stickerId: item.stickerId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    fulfillmentProvider: item.fulfillmentProvider,
    pricingTier: item.pricingTier,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/`,
    metadata: {
      cart: JSON.stringify(cartMeta),
    },
  });

  if (!session.url) {
    throw new Error("Stripe session URL is null");
  }

  return session.url;
}
