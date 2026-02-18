"use client";

import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/lib/cart";
import { CartDrawer } from "./CartDrawer";

export function SiteHeader() {
  const [cartOpen, setCartOpen] = useState(false);
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
          >
            Sticker Trendz
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors"
            aria-label={
              itemCount > 0
                ? `Open cart, ${itemCount} item${itemCount !== 1 ? "s" : ""}`
                : "Open cart"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {itemCount > 0 && (
              <span
                className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium"
                aria-hidden="true"
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
