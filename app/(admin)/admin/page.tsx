import type { Metadata } from "next";
import { createClient } from "@/lib/supabase";
import type { DailyMetric } from "@/types";
import MetricsCard from "@/components/admin/MetricsCard";
import RevenueChart from "@/components/admin/RevenueChart";

export const metadata: Metadata = {
  title: "Dashboard — Sticker Trendz Admin",
  robots: { index: false, follow: false },
};

function sumField(rows: DailyMetric[], field: keyof DailyMetric): number {
  return rows.reduce((acc, r) => acc + (r[field] as number), 0);
}

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("*")
    .order("date", { ascending: false })
    .limit(30);

  const metrics: DailyMetric[] = error || !data ? [] : data;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRow = metrics.find((m) => m.date === todayStr);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const thisMonthStr = todayStr.slice(0, 7); // "YYYY-MM"

  const weekRows = metrics.filter((m) => m.date >= sevenDaysAgoStr);
  const monthRows = metrics.filter((m) => m.date.startsWith(thisMonthStr));

  const revenueToday = todayRow?.gross_revenue ?? 0;
  const revenueWeek = sumField(weekRows, "gross_revenue");
  const revenueMonth = sumField(monthRows, "gross_revenue");
  const ordersMonth = sumField(monthRows, "orders");
  const newListingsToday = todayRow?.new_listings ?? 0;
  const avgOrderValue = todayRow?.avg_order_value ?? 0;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-8">
        <MetricsCard title="Revenue Today" value={revenueToday} prefix="$" />
        <MetricsCard title="Revenue This Week" value={revenueWeek} prefix="$" />
        <MetricsCard
          title="Revenue This Month"
          value={revenueMonth}
          prefix="$"
        />
        <MetricsCard
          title="Total Orders (Month)"
          value={ordersMonth}
          prefix=""
        />
        <MetricsCard
          title="New Listings Today"
          value={newListingsToday}
          prefix=""
        />
        <MetricsCard
          title="Avg. Order Value"
          value={avgOrderValue}
          prefix="$"
        />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={metrics} />
    </main>
  );
}
