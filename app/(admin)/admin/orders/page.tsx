import type { Metadata } from "next";
import { createClient } from "@/lib/supabase";
import type { Order } from "@/types";
import OrdersTable from "@/components/admin/OrdersTable";

export const metadata: Metadata = {
  title: "Orders — Sticker Trendz Admin",
  robots: { index: false, follow: false },
};

type OrderRow = Order & { sticker_title: string };

export default async function AdminOrdersPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, stickers!sticker_id(title)")
    .order("created_at", { ascending: false });

  let orders: OrderRow[] = [];

  if (!error && data) {
    orders = data.map((row) => {
      const { stickers, ...order } = row as Order & {
        stickers: { title: string } | null;
      };
      return {
        ...order,
        sticker_title: stickers?.title ?? "Unknown sticker",
      };
    });
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>
      <OrdersTable orders={orders} />
    </main>
  );
}
