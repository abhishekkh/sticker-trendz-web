import StickersTable from "@/components/admin/StickersTable";

export default function AdminStickersLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inventory</h1>
      <StickersTable stickers={[]} isLoading={true} />
    </main>
  );
}
