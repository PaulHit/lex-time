import { formatHoursDecimal } from "@/lib/time";

export default function SummaryStats({
  total,
  totalMinutes,
  billableMinutes,
}: {
  total: number;
  totalMinutes: number;
  billableMinutes: number;
}) {
  const nonBillableMinutes = totalMinutes - billableMinutes;
  const billablePct =
    totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  const stats = [
    { label: "Entries", value: String(total), accent: "text-stone-800" },
    {
      label: "Total hours",
      value: formatHoursDecimal(totalMinutes),
      accent: "text-stone-800",
    },
    {
      label: "Billable hours",
      value: formatHoursDecimal(billableMinutes),
      accent: "text-emerald-700",
      sub: `${billablePct}% of tracked time`,
    },
    {
      label: "Non-billable hours",
      value: formatHoursDecimal(nonBillableMinutes),
      accent: "text-stone-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-line bg-surface p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-stone-500">{stat.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${stat.accent}`}>
            {stat.value}
          </p>
          {stat.sub && (
            <p className="mt-0.5 text-xs text-stone-400">{stat.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
