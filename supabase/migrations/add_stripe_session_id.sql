-- Add stripe_session_id column to orders table
-- Links website orders to their Stripe Checkout session and serves as idempotency key.
-- Non-unique because a single session produces multiple rows (one per sticker in cart).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
