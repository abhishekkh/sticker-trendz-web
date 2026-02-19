import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase";
import { StickerGrid } from "@/components/shop/StickerGrid";
import { StickerGridSkeleton } from "@/components/shop/StickerGridSkeleton";
import type { Sticker } from "@/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sticker Trendz — Trending Stickers, Delivered",
  description:
    "Shop trending stickers, delivered fast. Browse Just Dropped, Trending, Cooling, and Evergreen styles.",
};

async function fetchStickers(): Promise<Sticker[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stickers")
    .select("*")
    .not("published_at", "is", null)
    .eq("moderation_status", "approved")
    .order("published_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Sticker[];
}

async function ShopContent() {
  const stickers = await fetchStickers();
  return <StickerGrid stickers={stickers} />;
}

export default function ShopPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shop Stickers</h1>
      <Suspense fallback={<StickerGridSkeleton />}>
        <ShopContent />
      </Suspense>
    </main>
  );
}
