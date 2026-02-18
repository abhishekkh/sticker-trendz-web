# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🛑 STOP — Run codemap before ANY task

```bash
codemap .                     # Project structure
codemap --deps                # How files connect
codemap --diff                # What changed vs main
codemap --diff --ref <branch> # Changes vs specific branch
```

## Required Usage

**BEFORE starting any task**, run `codemap .` first.

**ALWAYS run `codemap --deps` when:**
- User asks how something works
- Refactoring or moving code
- Tracing imports or dependencies

**ALWAYS run `codemap --diff` when:**
- Reviewing or summarizing changes
- Before committing code
- User asks what changed
- Use `--ref <branch>` when comparing against something other than main

## Project Status

This project is in the **scaffolding phase**. `SPEC.md` contains the full product specification and `tickets.csv` contains the ordered engineering tickets (STRW-001 through STRW-029). No application code exists yet. Start from ticket STRW-002 to scaffold the Next.js project.

## Commands

```bash
npm run dev        # Start local dev server (http://localhost:3000)
npm run build      # Production build (runs tsc + Next.js build)
npm run lint       # ESLint
npx tsc --noEmit  # Type-check without building
```

Stripe webhook testing locally:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router, TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Payments | Stripe Checkout (hosted) |
| Database | Supabase JS client (existing instance) |
| Images | Cloudflare R2 CDN |
| Cart state | Zustand + localStorage |
| Admin auth | Next.js middleware + HttpOnly cookie + HMAC |
| Hosting | Vercel |

## Architecture

### Route Groups
- `app/(shop)/` — customer-facing pages (`/`, `/stickers/[id]`, `/checkout/success`)
- `app/(admin)/admin/` — password-protected admin pages (`/admin`, `/admin/login`, `/admin/orders`, `/admin/stickers`)
- `app/api/` — three API routes: `checkout`, `admin/login`, `webhooks/stripe`
- `middleware.ts` at root — guards all `/admin/*` except `/admin/login`

### Key Architectural Constraints

**Server-only Supabase client**: `lib/supabase.ts` uses `SUPABASE_SERVICE_KEY` (not `NEXT_PUBLIC_`). Never import it in client components.

**Price trust**: `POST /api/checkout` always re-fetches prices from Supabase. Client-supplied prices are ignored entirely.

**Webhook idempotency**: `POST /api/webhooks/stripe` checks for existing `orders` rows with the same `stripe_session_id` before inserting. Stripe retries require this.

**One order row per sticker**: A multi-sticker cart creates one `orders` row per sticker, all sharing the same `stripe_session_id`.

**Raw body for Stripe**: The webhook route must receive the raw (unparsed) request body for Stripe signature verification — do not use `request.json()` before `stripe.webhooks.constructEvent()`.

### Data Flow

```
Supabase stickers → Next.js server components → rendered HTML
Customer cart (Zustand/localStorage) → POST /api/checkout → Stripe Checkout session URL
Stripe payment complete → POST /api/webhooks/stripe → orders rows + sales_count increment
```

### Admin Auth Flow
1. Middleware checks `admin_token` cookie on all `/admin/*` routes (except `/admin/login`)
2. `POST /api/admin/login` validates password vs `ADMIN_SECRET`, sets HttpOnly cookie with HMAC-SHA256 value
3. Token = HMAC-SHA256(`ADMIN_SECRET` + Unix timestamp), expires 24h

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=           # server-only, never NEXT_PUBLIC_
NEXT_PUBLIC_R2_PUBLIC_URL=      # CDN base URL for images
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ADMIN_SECRET=                   # admin password
NEXT_PUBLIC_BASE_URL=           # e.g. https://stickertrendz.com
```

## Database

### Key Tables
- `stickers` — existing table, read-only from storefront. Filter published: `published_at IS NOT NULL AND moderation_status = 'approved'`
- `orders` — shared with Etsy pipeline. Website orders have `stripe_session_id` set, Etsy orders have `etsy_order_id`
- `daily_metrics` — materialized view, refresh after inserting orders: `REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics`

### Required Migration (STRW-001)
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
```

## Pricing Tiers

| `current_pricing_tier` | Label | Badge Color |
|------------------------|-------|-------------|
| `just_dropped` | Just Dropped | Red/orange |
| `trending` | Trending | Blue |
| `cooling` | Cooling | Slate |
| `evergreen` | Evergreen | Green |

Prices are stored directly on `stickers.price` — read from DB, not computed at runtime.

## Implementation Order

Follow tickets STRW-001 → STRW-029. Critical path: STRW-001 (migration) → STRW-002 (scaffold) → STRW-003 (types) → STRW-004/5/6/7 (lib + middleware) → shop pages → admin pages → deploy.
