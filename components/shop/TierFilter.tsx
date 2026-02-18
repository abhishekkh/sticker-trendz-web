"use client";

import type { Sticker } from "@/types";

export type Tier = Sticker["current_pricing_tier"] | null;

const TIERS: { value: Tier; label: string }[] = [
  { value: null, label: "All" },
  { value: "just_dropped", label: "Just Dropped" },
  { value: "trending", label: "Trending" },
  { value: "cooling", label: "Cooling" },
  { value: "evergreen", label: "Evergreen" },
];

interface TierFilterProps {
  activeTier: Tier;
  onFilterChange: (tier: Tier) => void;
}

export function TierFilter({ activeTier, onFilterChange }: TierFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tier">
      {TIERS.map(({ value, label }) => {
        const isActive = activeTier === value;
        return (
          <button
            key={String(value)}
            onClick={() => onFilterChange(isActive && value !== null ? null : value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isActive
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
            aria-pressed={isActive}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
