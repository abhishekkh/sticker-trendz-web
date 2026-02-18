import type { Metadata } from "next";
import Link from "next/link";
import CartClearer from "./CartClearer";

export const metadata: Metadata = {
  title: "Order Confirmed — Sticker Trendz",
};

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function OrderSuccessPage({ searchParams }: PageProps) {
  const { session_id } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <CartClearer />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your purchase. Your stickers are on their way!
          </p>
        </div>

        {session_id ? (
          <p className="text-sm text-gray-500">
            Order reference:{" "}
            <span className="font-mono text-gray-700 break-all">{session_id}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Your payment was received and your order is being processed.
          </p>
        )}

        <Link
          href="/"
          className="inline-block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}
