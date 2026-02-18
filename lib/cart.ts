"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (stickerId: string) => void;
  updateQuantity: (stickerId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.stickerId === item.stickerId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.stickerId === item.stickerId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        });
      },

      removeItem: (stickerId) => {
        set((state) => ({
          items: state.items.filter((i) => i.stickerId !== stickerId),
        }));
      },

      updateQuantity: (stickerId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(stickerId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.stickerId === stickerId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      cartTotal: () => {
        const { items } = get();
        const total = items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        );
        return Math.round(total * 100) / 100;
      },

      itemCount: () => {
        const { items } = get();
        return items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    {
      name: "sticker-trendz-cart",
    }
  )
);
