"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart";

export default function CartClearer() {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
