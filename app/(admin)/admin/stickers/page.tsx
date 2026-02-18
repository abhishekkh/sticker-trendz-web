import type { Metadata } from "next";
import { createClient } from "@/lib/supabase";
import type { Sticker } from "@/types";
import StickersTable from "@/components/admin/StickersTable";

export const metadata: Metadata = {
  title: "Inventory — Sticker Trendz Admin",
  robots: { index: false, follow: false },
};

export default async function AdminStickersPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stickers")
    .select("*")
    .not("published_at", "is", null)
    .order("created_at", { ascending: false });

  const stickers: Sticker[] = !error && data ? (data as Sticker[]) : [];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inventory</h1>
      <StickersTable stickers={stickers} />
    </main>
  );
}
