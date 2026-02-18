"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCartStore } from "@/lib/cart";
import { Button } from "@/components/ui/button";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, cartTotal } = useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const router = useRouter();

  async function handleCheckout() {
    setIsCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            stickerId: i.stickerId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Checkout failed. Please try again.");
        return;
      }
      router.push(data.url);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Cart</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
            aria-label="Close cart"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.map((item) => (
              <div key={item.stickerId} className="flex gap-3">
                {item.thumbnailUrl && (
                  <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-50">
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${item.price.toFixed(2)} each
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() =>
                        updateQuantity(item.stickerId, item.quantity - 1)
                      }
                      className="w-6 h-6 rounded border border-gray-300 text-sm flex items-center justify-center hover:bg-gray-100"
                      aria-label={`Decrease quantity of ${item.title}`}
                    >
                      −
                    </button>
                    <span className="text-sm w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.stickerId, item.quantity + 1)
                      }
                      className="w-6 h-6 rounded border border-gray-300 text-sm flex items-center justify-center hover:bg-gray-100"
                      aria-label={`Increase quantity of ${item.title}`}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.stickerId)}
                      className="ml-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex justify-between text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>${cartTotal().toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500">
            Free shipping · Secure checkout
          </p>
          <Button
            className="w-full"
            disabled={items.length === 0 || isCheckingOut}
            onClick={handleCheckout}
          >
            {isCheckingOut ? "Processing..." : "Checkout"}
          </Button>
        </div>
      </div>
    </>
  );
}
