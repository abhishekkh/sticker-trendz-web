import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-6">
          <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Admin
          </span>
          <Link
            href="/admin"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/orders"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Orders
          </Link>
          <Link
            href="/admin/stickers"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Inventory
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
