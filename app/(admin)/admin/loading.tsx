import MetricsCard from "@/components/admin/MetricsCard";
import RevenueChart from "@/components/admin/RevenueChart";

const CARD_TITLES = [
  "Revenue Today",
  "Revenue This Week",
  "Revenue This Month",
  "Total Orders (Month)",
  "New Listings Today",
  "Avg. Order Value",
];

export default function AdminDashboardLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-8">
        {CARD_TITLES.map((title) => (
          <MetricsCard key={title} title={title} value={0} isLoading={true} />
        ))}
      </div>

      <RevenueChart data={[]} isLoading={true} />
    </main>
  );
}
