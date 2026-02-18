import type { Order } from "@/types";
import { cn } from "@/lib/utils";

type OrderRow = Order & { sticker_title: string };

interface OrdersTableProps {
  orders: OrderRow[];
  isLoading?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  shipped: "bg-green-100 text-green-800",
  refunded: "bg-red-100 text-red-800",
};

function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status.toLowerCase()] ?? "bg-gray-100 text-gray-700";
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateId(id: string | null): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

function displayOrderId(order: OrderRow): { short: string; full: string } {
  if (order.etsy_order_id) {
    return { short: order.etsy_order_id, full: order.etsy_order_id };
  }
  if (order.id) {
    return { short: truncateId(order.id), full: order.id };
  }
  return { short: "—", full: "—" };
}

const SKELETON_ROWS = 5;

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 animate-pulse w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export default function OrdersTable({
  orders,
  isLoading = false,
  className,
}: OrdersTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3 whitespace-nowrap">Order ID</th>
            <th className="px-4 py-3 whitespace-nowrap">Sticker</th>
            <th className="px-4 py-3 whitespace-nowrap">Qty</th>
            <th className="px-4 py-3 whitespace-nowrap">Amount</th>
            <th className="px-4 py-3 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 whitespace-nowrap">Fulfillment</th>
            <th className="px-4 py-3 whitespace-nowrap">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <SkeletonRow key={i} />
            ))
          ) : orders.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-10 text-center text-gray-400 text-sm"
              >
                No orders yet
              </td>
            </tr>
          ) : (
            orders.map((order) => {
              const { short, full } = displayOrderId(order);
              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600">
                    <span title={full}>{short}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-gray-900">
                    {order.sticker_title}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{order.quantity}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        statusBadgeClass(order.status)
                      )}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 capitalize">
                    {order.fulfillment_provider ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {formatDate(order.created_at)}
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
