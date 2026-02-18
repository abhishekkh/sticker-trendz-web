"use client";

import type { Sticker } from "@/types";
import { useCartStore } from "@/lib/cart";
import { Button } from "@/components/ui/button";

interface AddToCartButtonProps {
  sticker: Sticker;
}

export function AddToCartButton({ sticker }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() =>
        addItem({
          stickerId: sticker.id,
          title: sticker.title,
          thumbnailUrl: sticker.thumbnail_url,
          price: sticker.price,
        })
      }
    >
      Add to Cart
    </Button>
  );
}
