import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only: uses SUPABASE_SERVICE_KEY (not NEXT_PUBLIC_).
// Never import this module in client components.
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  return createSupabaseClient(supabaseUrl, supabaseKey);
}
