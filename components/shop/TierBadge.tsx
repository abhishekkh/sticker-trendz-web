import type { Sticker } from "@/types";

const TIER_CONFIG: Record<
  Sticker["current_pricing_tier"],
  { label: string; className: string }
> = {
  just_dropped: {
    label: "Just Dropped",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  trending: {
    label: "Trending",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  cooling: {
    label: "Cooling",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  evergreen: {
    label: "Evergreen",
    className: "bg-green-100 text-green-700 border-green-200",
  },
};

interface TierBadgeProps {
  tier: Sticker["current_pricing_tier"];
  className?: string;
}

export function TierBadge({ tier, className = "" }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.evergreen;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
      aria-label={`Pricing tier: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
