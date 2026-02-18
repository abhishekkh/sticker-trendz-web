export interface Sticker {
  id: string;
  trend_id: string | null;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  original_url: string | null;
  size: string;
  generation_prompt: string | null;
  generation_model: string | null;
  generation_model_version: string | null;
  moderation_status: string | null;
  moderation_score: number | null;
  moderation_categories: Record<string, unknown> | null;
  etsy_listing_id: string | null;
  price: number;
  current_pricing_tier: "just_dropped" | "trending" | "cooling" | "evergreen";
  floor_price: number | null;
  base_cost: number | null;
  shipping_cost: number | null;
  packaging_cost: number | null;
  fulfillment_provider: string | null;
  tags: string[] | null;
  sales_count: number;
  view_count: number;
  last_sale_at: string | null;
  created_at: string;
  published_at: string | null;
}

export interface CustomerData {
  name: string;
  email: string;
  shipping_address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface Order {
  id: string;
  etsy_order_id: string | null;
  etsy_receipt_id: string | null;
  stripe_session_id: string | null;
  sticker_id: string | null;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  fulfillment_provider: string | null;
  fulfillment_order_id: string | null;
  fulfillment_attempts: number;
  fulfillment_last_error: string | null;
  status: string;
  pricing_tier_at_sale: string | null;
  customer_data: CustomerData | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyMetric {
  date: string;
  orders: number;
  gross_revenue: number;
  cogs: number;
  etsy_fees: number;
  estimated_profit: number;
  new_listings: number;
  avg_order_value: number;
}

export interface CartItem {
  stickerId: string;
  title: string;
  thumbnailUrl: string | null;
  price: number;
  quantity: number;
}
