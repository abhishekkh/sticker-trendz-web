import OrdersTable from "@/components/admin/OrdersTable";

export default function AdminOrdersLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>
      <OrdersTable orders={[]} isLoading={true} />
    </main>
  );
}
