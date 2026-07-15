import { formatHoursDecimal } from "@/lib/time";
import { TimeEntry } from "@/lib/types";

export default function SummaryStats({ entries }: { entries: TimeEntry[] }) {
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;
  const billablePct =
    totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  const stats = [
    { label: "Entries", value: String(entries.length), accent: "text-slate-900" },
    {
      label: "Total hours",
      value: formatHoursDecimal(totalMinutes),
      accent: "text-slate-900",
    },
    {
      label: "Billable hours",
      value: formatHoursDecimal(billableMinutes),
      accent: "text-emerald-600",
      sub: `${billablePct}% of tracked time`,
    },
    {
      label: "Non-billable hours",
      value: formatHoursDecimal(nonBillableMinutes),
      accent: "text-slate-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-slate-500">{stat.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${stat.accent}`}>
            {stat.value}
          </p>
          {stat.sub && (
            <p className="mt-0.5 text-xs text-slate-400">{stat.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
