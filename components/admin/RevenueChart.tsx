"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { DailyMetric } from "@/types";

interface RevenueChartProps {
  data: DailyMetric[];
  isLoading?: boolean;
  className?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDollar(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function RevenueChart({ data, isLoading = false, className }: RevenueChartProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
          className
        )}
      >
        <div className="h-4 w-48 rounded bg-gray-200 animate-pulse mb-4" />
        <div className="h-[300px] rounded bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-64 rounded-xl border border-gray-200 bg-white text-gray-400 text-sm",
          className
        )}
      >
        No data available
      </div>
    );
  }

  // Chart expects ascending chronological order
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({
      date: formatDate(m.date),
      "Gross Revenue": m.gross_revenue,
      "Est. Profit": m.estimated_profit,
    }));

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      <p className="text-sm font-medium text-gray-500 mb-4">
        Revenue &amp; Profit (last 30 days)
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatDollar}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            formatter={(value: number | undefined) =>
            value !== undefined ? formatDollar(value) : "$0"
          }
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "13px", paddingTop: "16px" }}
          />
          <Line
            type="monotone"
            dataKey="Gross Revenue"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Est. Profit"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
