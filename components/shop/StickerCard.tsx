"use client";

import Image from "next/image";
import Link from "next/link";
import type { Sticker } from "@/types";
import { TierBadge } from "./TierBadge";
import { useCartStore } from "@/lib/cart";
import { Button } from "@/components/ui/button";

interface StickerCardProps {
  sticker: Sticker;
}

export function StickerCard({ sticker }: StickerCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const imageUrl = sticker.thumbnail_url ?? sticker.image_url;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      stickerId: sticker.id,
      title: sticker.title,
      thumbnailUrl: sticker.thumbnail_url,
      price: sticker.price,
    });
  }

  return (
    <div className="group relative flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link
        href={`/stickers/${sticker.id}`}
        className="block aspect-square relative overflow-hidden bg-gray-50"
      >
        <Image
          src={imageUrl}
          alt={sticker.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-200"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </Link>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <TierBadge tier={sticker.current_pricing_tier} />
        <Link href={`/stickers/${sticker.id}`}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600">
            {sticker.title}
          </h3>
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-semibold text-gray-900">
            ${sticker.price.toFixed(2)}
          </span>
          <Button size="sm" onClick={handleAddToCart}>
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
