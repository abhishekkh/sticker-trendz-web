import { cn } from "@/lib/utils";

interface MetricsCardProps {
  title: string;
  value: string | number;
  prefix?: "$" | "";
  isLoading?: boolean;
  className?: string;
}

export default function MetricsCard({
  title,
  value,
  prefix = "",
  isLoading = false,
  className,
}: MetricsCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
          className
        )}
      >
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse mb-3" />
        <div className="h-8 w-32 rounded bg-gray-200 animate-pulse" />
      </div>
    );
  }

  const formatted =
    typeof value === "number"
      ? prefix === "$"
        ? value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : value.toLocaleString("en-US")
      : value;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">
        {prefix && <span className="text-gray-500 text-lg mr-0.5">{prefix}</span>}
        {formatted}
      </p>
    </div>
  );
}
