import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase";
import type { Sticker } from "@/types";
import { TierBadge } from "@/components/shop/TierBadge";
import { AddToCartButton } from "@/components/shop/AddToCartButton";

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchSticker(id: string): Promise<Sticker | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("stickers")
    .select("*")
    .eq("id", id)
    .not("published_at", "is", null)
    .eq("moderation_status", "approved")
    .single();
  return data as Sticker | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sticker = await fetchSticker(id);
  if (!sticker) {
    return { title: "404 Not Found — Sticker Trendz" };
  }
  const description = sticker.description?.slice(0, 160) ?? undefined;
  return {
    title: `${sticker.title} — Sticker Trendz`,
    description,
    openGraph: {
      title: sticker.title,
      description,
      images: [sticker.image_url],
    },
  };
}

export default async function StickerDetailPage({ params }: Props) {
  const { id } = await params;
  const sticker = await fetchSticker(id);

  if (!sticker) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50">
          <Image
            src={sticker.image_url}
            alt={sticker.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        <div className="flex flex-col gap-4">
          <TierBadge tier={sticker.current_pricing_tier} />
          <h1 className="text-2xl font-bold text-gray-900">{sticker.title}</h1>

          {sticker.description && (
            <p className="text-gray-600">{sticker.description}</p>
          )}

          <div className="flex gap-4 text-sm text-gray-500">
            <span>Size: {sticker.size}</span>
            {sticker.sales_count > 0 && (
              <span>{sticker.sales_count} sold</span>
            )}
          </div>

          <div>
            <p className="text-3xl font-bold text-gray-900">
              ${sticker.price.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Free shipping</p>
          </div>

          <AddToCartButton sticker={sticker} />
        </div>
      </div>
    </main>
  );
}
