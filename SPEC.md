# Sticker Trendz — Custom Storefront Spec

## Context

Etsy approval is pending. This custom storefront lets us sell stickers immediately by reading existing product data from Supabase + R2, handling payments with Stripe, and writing orders back to the existing `orders` table so the fulfillment pipeline (sticker_mule / self_usps) picks them up automatically. The site also doubles as an independent sales channel after Etsy goes live.

---

## Product Spec

### Goals
1. Sell stickers to customers **today** — no Etsy dependency
2. Integrate with existing Supabase + R2 stack — no duplicated data
3. Orders flow into existing fulfillment pipeline automatically
4. Simple admin dashboard for revenue/inventory monitoring

### Non-goals (V1)
- User accounts / order history lookup
- Coupon codes / discounts
- International shipping
- Email receipts from site (Stripe sends them automatically)
- Stock / inventory limits (print-on-demand, no stock tracking needed)

---

## Pages & Features

### Customer-facing

| Page | Route | Description |
|------|-------|-------------|
| Shop | `/` | Sticker grid. Filter by tier badge: Just Dropped / Trending / Cooling / Evergreen. Sort by newest or price. Mobile-first responsive grid (1 col → 2 col → 4 col). |
| Product Detail | `/stickers/[id]` | Full image, title, description, size info, pricing tier badge, sales count, Add to Cart button. Returns 404 for invalid/unpublished sticker IDs. |
| Cart | Slide-over drawer | Add/remove/adjust quantity. Persisted in localStorage. Shows line item prices and cart total. |
| Checkout | → Stripe Checkout | Redirect to Stripe-hosted checkout page (handles PCI, address collection, Apple Pay). Free shipping. |
| Order Success | `/checkout/success` | Confirm order with Stripe session ID. Show friendly message + order number. |
| Not Found | `/not-found` | Custom 404 page with link back to shop. |

### Admin (password-protected)

| Page | Route | Description |
|------|-------|-------------|
| Login | `/admin/login` | Simple password form. Sets `admin_token` cookie on success. |
| Dashboard | `/admin` | Revenue today / this week / this month. New listings. Orders count. Charts from `daily_metrics` view. |
| Orders | `/admin/orders` | Table of all orders (both Etsy + website). Status, sticker, amount, fulfillment provider. |
| Inventory | `/admin/stickers` | Published stickers with sales count, current tier, price, image thumbnail. |

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15 (App Router, TypeScript) | Server components = fast page loads without extra API layer |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, accessible components, no design debt |
| Payments | Stripe Checkout (hosted) | PCI-compliant, zero custom form code, handles Apple/Google Pay |
| Database | Supabase JS client (existing instance) | Reuse existing tables — no new infra |
| Images | Cloudflare R2 CDN (existing bucket) | `thumbnail_url` for grid, `image_url` for detail page |
| Cart state | Zustand + localStorage | Simple, no server state needed |
| Admin auth | Next.js middleware + `ADMIN_SECRET` env var + cookie | Lightest option for solo admin |
| Hosting | Vercel | Zero-config Next.js, preview deploys on PRs, free tier |

---

## Database Schemas

### `stickers` table (existing — no changes)

```sql
CREATE TABLE IF NOT EXISTS stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID REFERENCES trends(id),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    original_url TEXT,
    size TEXT NOT NULL DEFAULT '3in',
    generation_prompt TEXT,
    generation_model TEXT DEFAULT 'stable-diffusion-xl',
    generation_model_version TEXT,
    moderation_status TEXT DEFAULT 'pending',
    moderation_score FLOAT,
    moderation_categories JSONB,
    etsy_listing_id TEXT,
    price DECIMAL(10,2) DEFAULT 4.49,
    current_pricing_tier TEXT DEFAULT 'just_dropped',
    floor_price DECIMAL(10,2),
    base_cost DECIMAL(10,2),
    shipping_cost DECIMAL(10,2),
    packaging_cost DECIMAL(10,2),
    fulfillment_provider TEXT DEFAULT 'sticker_mule',
    tags TEXT[],
    sales_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_sale_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);
```

### `orders` table (one migration needed)

```sql
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etsy_order_id TEXT UNIQUE,
    etsy_receipt_id TEXT,
    stripe_session_id TEXT,                  -- ⬅ NEW: links website orders + idempotency (indexed, not unique — multi-item carts share one session)
    sticker_id UUID REFERENCES stickers(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    fulfillment_provider TEXT,
    fulfillment_order_id TEXT,
    fulfillment_attempts INTEGER DEFAULT 0,
    fulfillment_last_error TEXT,
    status TEXT DEFAULT 'pending',
    pricing_tier_at_sale TEXT,
    customer_data JSONB,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `daily_metrics` materialized view (existing — no changes)

```sql
CREATE MATERIALIZED VIEW daily_metrics AS
SELECT
    date_trunc('day', o.created_at) AS date,
    COUNT(DISTINCT o.id) AS orders,
    SUM(o.total_amount) AS gross_revenue,
    SUM(s.base_cost * o.quantity) AS cogs,
    SUM(o.total_amount * 0.10) AS etsy_fees,
    SUM(o.total_amount) - SUM(s.base_cost * o.quantity) - SUM(o.total_amount * 0.10) AS estimated_profit,
    COUNT(DISTINCT s.id) FILTER (WHERE s.published_at::date = date_trunc('day', o.created_at)::date) AS new_listings,
    AVG(o.total_amount) AS avg_order_value
FROM orders o
JOIN stickers s ON o.sticker_id = s.id
WHERE o.status NOT IN ('refunded')
GROUP BY date_trunc('day', o.created_at);
```

**View columns used by admin dashboard:**

| Column | Type | Used in |
|--------|------|---------|
| date | timestamptz | X-axis for charts |
| orders | bigint | Orders count card |
| gross_revenue | numeric | Revenue card + chart |
| estimated_profit | numeric | Profit card + chart |
| new_listings | bigint | New listings card |
| avg_order_value | numeric | AOV card |
| cogs | numeric | Chart breakdown |
| etsy_fees | numeric | Chart breakdown (note: applies 10% to all orders including website — V2 fix) |

**Important:** This is a materialized view — it must be refreshed to reflect new data:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics;
```
The existing fulfillment pipeline likely handles this. If not, the Stripe webhook handler should trigger a refresh after inserting orders, or a cron job should refresh it periodically.

**Required migration:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
```

---

## Pricing

Prices are determined by pricing tier and written to the `price` column on each sticker by the existing pipeline. The storefront reads `stickers.price` directly.

| Tier | Default Price |
|------|--------------|
| just_dropped | $4.49 |
| trending | $3.99 |
| cooling | $2.99 |
| evergreen | $1.99 |

**Shipping: Free** — shipping cost is absorbed into sticker pricing.

---

## Data Flow

```
Supabase stickers table
  └─ (read) Published + approved stickers
         └─ Next.js server components render product pages

Customer clicks "Checkout"
  └─ POST /api/checkout
         ├─ Validate: all cart stickers still published + approved
         ├─ Read current price from DB (not from client cart)
         └─ Stripe Checkout session created
                ├─ One line_item per sticker (name, image, unit_price × qty)
                ├─ metadata: JSON cart summary for webhook
                └─ Customer completes payment on Stripe
                       └─ Stripe sends webhook → POST /api/webhooks/stripe
                              ├─ Check idempotency: skip if stripe_session_id exists
                              ├─ Write one row per sticker to orders table
                              ├─ Increment sales_count on each sticker
                              └─ Existing fulfillment pipeline picks up
```

---

## Multi-Item Cart → Orders

A cart with multiple stickers creates **one row per sticker** in the `orders` table. All rows from the same checkout share the same `stripe_session_id`.

Example: Cart has Sticker A (qty 2) + Sticker B (qty 1) → 2 rows in `orders`:

| stripe_session_id | sticker_id | quantity | unit_price | total_amount |
|-------------------|------------|----------|------------|--------------|
| cs_abc123 | sticker-a-id | 2 | 3.99 | 7.98 |
| cs_abc123 | sticker-b-id | 1 | 4.49 | 4.49 |

This preserves compatibility with the fulfillment pipeline which processes one sticker per order row.

---

## Checkout Validation

Before creating a Stripe session, `POST /api/checkout` validates:

1. **All stickers exist** — IDs in cart match real sticker records
2. **All stickers are published** — `published_at IS NOT NULL AND moderation_status = 'approved'`
3. **Prices are fresh** — use `stickers.price` from DB, not the price sent from the client cart
4. **Cart is not empty** — at least one item

If validation fails, return a 400 with details about which items are invalid so the client can update the cart UI.

---

## Webhook Idempotency

The Stripe webhook handler (`POST /api/webhooks/stripe`) must be idempotent because Stripe retries failed deliveries:

1. Extract `checkout_session_id` from the event
2. Query `orders` for existing rows with that `stripe_session_id`
3. If rows exist → return 200 immediately (already processed)
4. If not → insert order rows and return 200

---

## Supabase Queries

**Published stickers (catalog):**
```sql
SELECT s.*, t.topic, t.score_overall
FROM stickers s
JOIN trends t ON s.trend_id = t.id
WHERE s.published_at IS NOT NULL
  AND s.moderation_status = 'approved'
ORDER BY s.published_at DESC
```

**Admin revenue (from existing view):**
```sql
SELECT * FROM daily_metrics ORDER BY date DESC LIMIT 30
```

---

## Order Record (written on Stripe webhook)

One row per sticker in the cart, mapping to the existing `orders` table:

```typescript
{
  stripe_session_id: string,      // for idempotency + linking website orders
  // etsy_order_id: null           (website orders)
  sticker_id: string,             // from line item metadata
  quantity: number,
  unit_price: number,             // price at time of purchase (from DB)
  total_amount: number,           // unit_price × quantity
  fulfillment_provider: string,   // from sticker record
  status: 'pending',              // fulfillment pipeline picks this up
  pricing_tier_at_sale: string,   // from sticker record
  customer_data: {                // from Stripe shipping_details
    name: string,
    email: string,
    shipping_address: {
      line1: string,
      line2: string | null,
      city: string,
      state: string,
      postal_code: string,
      country: string
    }
  }
}
```

---

## Admin Authentication

Simple password-based auth flow:

1. Middleware checks all `/admin/*` routes (except `/admin/login`) for an `admin_token` cookie
2. If no cookie or invalid → redirect to `/admin/login`
3. `/admin/login` page shows a password input form
4. `POST /api/admin/login` validates password against `ADMIN_SECRET` env var
5. On success → set `admin_token` HttpOnly cookie (value = HMAC of secret + timestamp, expires in 24h)
6. Redirect to `/admin`

---

## SEO & Meta

- Each page sets `<title>` and `<meta description>` via Next.js Metadata API
- Product detail pages include Open Graph tags (`og:title`, `og:image`, `og:description`) for social sharing
- Shop homepage: "Sticker Trendz — Trending Stickers, Delivered"
- Product pages: "{sticker.title} — Sticker Trendz"

---

## UI States

| State | Handling |
|-------|----------|
| Loading (shop grid) | Skeleton cards (shimmer) matching grid layout |
| Loading (admin tables) | Skeleton table rows |
| Empty grid (no stickers match filter) | "No stickers found" message with reset filter button |
| Sticker not found | Next.js `notFound()` → custom 404 |
| Checkout error / cancelled | User returns to site, cart is preserved, toast error message |
| Stripe webhook failure | Stripe auto-retries; idempotency guard prevents duplicates |

---

## Repo & Project Structure

```
sticker-trendz-web/
├── app/
│   ├── (shop)/
│   │   ├── page.tsx                  # / — Shop homepage with sticker grid
│   │   ├── stickers/[id]/page.tsx    # /stickers/[id] — Product detail
│   │   └── checkout/
│   │       └── success/page.tsx      # /checkout/success — Order confirmed
│   ├── (admin)/
│   │   └── admin/
│   │       ├── page.tsx              # /admin — Revenue dashboard
│   │       ├── login/page.tsx        # /admin/login — Password form
│   │       ├── orders/page.tsx       # /admin/orders — Orders table
│   │       └── stickers/page.tsx     # /admin/stickers — Inventory
│   ├── api/
│   │   ├── checkout/route.ts         # POST: create Stripe Checkout session
│   │   ├── admin/login/route.ts      # POST: validate password, set cookie
│   │   └── webhooks/stripe/route.ts  # POST: handle payment events → Supabase
│   ├── layout.tsx
│   ├── not-found.tsx                 # Custom 404 page
│   └── middleware.ts                 # Admin route protection
├── components/
│   ├── shop/
│   │   ├── StickerGrid.tsx
│   │   ├── StickerCard.tsx
│   │   ├── TierBadge.tsx
│   │   ├── TierFilter.tsx
│   │   └── CartDrawer.tsx
│   └── admin/
│       ├── MetricsCard.tsx
│       ├── OrdersTable.tsx
│       └── RevenueChart.tsx
├── lib/
│   ├── supabase.ts
│   ├── stripe.ts
│   └── cart.ts
├── types/
│   └── index.ts
├── supabase/
│   └── migrations/
│       └── add_stripe_session_id.sql  # ALTER TABLE orders ADD stripe_session_id
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Environment Variables

```bash
# Supabase (same values as sticker-trendz)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=          # server-side only (not NEXT_PUBLIC_)

# Cloudflare R2
NEXT_PUBLIC_R2_PUBLIC_URL=     # CDN base URL for images

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Admin
ADMIN_SECRET=                  # password for /admin routes

# App
NEXT_PUBLIC_BASE_URL=          # e.g. https://stickertrendz.com (for OG tags, Stripe return URLs)
```

---

## Tier Badge Colors

| Tier | Label | Color |
|------|-------|-------|
| just_dropped | Just Dropped | Red/orange |
| trending | Trending | Blue |
| cooling | Cooling | Slate |
| evergreen | Evergreen | Green |

---

## Implementation Steps

1. Init repo + write SPEC.md
2. Run migration: add `stripe_session_id` column to `orders`
3. Scaffold Next.js 15 + shadcn/ui + deps
4. Supabase client + TypeScript types
5. Shop pages (homepage + product detail + 404 + SEO meta)
6. Cart (Zustand + localStorage + CartDrawer)
7. Stripe checkout API (with cart validation) + success page
8. Stripe webhook → Supabase order write (with idempotency)
9. Admin auth (login page + middleware + cookie)
10. Admin dashboard (3 pages)
11. Loading skeletons + error states
12. Deploy to Vercel + register Stripe webhook URL

---

## Deployment Checklist

- [ ] Set all env vars in Vercel project settings
- [ ] Run `stripe_session_id` migration on production Supabase
- [ ] Register webhook URL in Stripe dashboard: `https://<domain>/api/webhooks/stripe`
- [ ] Select webhook events: `checkout.session.completed`
- [ ] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET` env var
- [ ] Verify R2 CORS allows image loading from the Vercel domain

---

## Verification Checklist

- [ ] `npm run dev` — shop renders with sticker data from Supabase
- [ ] Mobile layout — grid is responsive (1→2→4 columns)
- [ ] Product page — 404 for invalid sticker ID
- [ ] Cart — add/remove/quantity adjustment persists across page reload
- [ ] Checkout — sticker unpublished between cart and checkout shows error
- [ ] Test order → Stripe test mode → order rows written to `orders` table with `status: 'pending'` and `stripe_session_id`
- [ ] Duplicate webhook delivery → no duplicate order rows
- [ ] Multi-sticker cart → correct number of order rows with shared `stripe_session_id`
- [ ] `/admin/login` — wrong password rejected, correct password sets cookie and redirects
- [ ] `/admin` — redirects to login without cookie
- [ ] `/admin` — shows correct revenue from `daily_metrics` view
- [ ] OG tags render correctly (test with https://opengraph.xyz)
- [ ] Deploy to Vercel preview URL, repeat tests
