"use client";

import { useState, useMemo } from "react";
import type { Sticker } from "@/types";
import { StickerCard } from "./StickerCard";
import { TierFilter, type Tier } from "./TierFilter";

type SortOption = "newest" | "price_asc" | "price_desc";

interface StickerGridProps {
  stickers: Sticker[];
}

export function StickerGrid({ stickers }: StickerGridProps) {
  const [activeTier, setActiveTier] = useState<Tier>(null);
  const [sort, setSort] = useState<SortOption>("newest");

  const filtered = useMemo(() => {
    let result = activeTier
      ? stickers.filter((s) => s.current_pricing_tier === activeTier)
      : stickers;

    if (sort === "price_asc") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      result = [...result].sort((a, b) => b.price - a.price);
    }

    return result;
  }, [stickers, activeTier, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <TierFilter activeTier={activeTier} onFilterChange={setActiveTier} />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          aria-label="Sort stickers"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-3">No stickers found</p>
          <button
            onClick={() => setActiveTier(null)}
            className="text-blue-600 hover:underline text-sm"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((sticker) => (
            <StickerCard key={sticker.id} sticker={sticker} />
          ))}
        </div>
      )}
    </div>
  );
}
