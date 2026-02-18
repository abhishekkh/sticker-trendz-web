"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { TierBadge } from "@/components/shop/TierBadge";
import type { Sticker } from "@/types";
import { cn } from "@/lib/utils";

type SortKey = "sales_count" | "price";
type SortDir = "asc" | "desc";

interface StickersTableProps {
  stickers: Sticker[];
  isLoading?: boolean;
  className?: string;
}

const SKELETON_ROWS = 5;
const COLS = 6;

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={cn("ml-1 inline-block text-[10px]", active ? "text-gray-900" : "text-gray-400")}>
      {active && dir === "desc" ? "↓" : "↑"}
    </span>
  );
}

interface SortableHeaderProps {
  label: string;
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
}

function SortableHeader({ label, col, sortKey, sortDir, onSort }: SortableHeaderProps) {
  return (
    <th
      className="px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-gray-800"
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon active={sortKey === col} dir={sortDir} />
    </th>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="h-10 w-10 rounded bg-gray-200 animate-pulse" />
      </td>
      {Array.from({ length: COLS - 1 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 animate-pulse w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export default function StickersTable({
  stickers,
  isLoading = false,
  className,
}: StickersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return stickers;
    return [...stickers].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const diff = aVal - bVal;
      return sortDir === "asc" ? diff : -diff;
    });
  }, [stickers, sortKey, sortDir]);

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3 whitespace-nowrap">Thumbnail</th>
            <th className="px-4 py-3 whitespace-nowrap">Title</th>
            <SortableHeader label="Sales Count" col="sales_count" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 whitespace-nowrap">Tier</th>
            <SortableHeader label="Price" col="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 whitespace-nowrap">Published Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <SkeletonRow key={i} />
            ))
          ) : sorted.length === 0 ? (
            <tr>
              <td
                colSpan={COLS}
                className="px-4 py-10 text-center text-gray-400 text-sm"
              >
                No published stickers
              </td>
            </tr>
          ) : (
            sorted.map((sticker) => {
              const imgSrc = sticker.thumbnail_url ?? sticker.image_url;
              return (
                <tr
                  key={sticker.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-md bg-gray-100">
                      <Image
                        src={imgSrc}
                        alt={sticker.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate text-gray-900 font-medium">
                    {sticker.title}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {sticker.sales_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={sticker.current_pricing_tier} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {formatCurrency(sticker.price)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {formatDate(sticker.published_at)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
