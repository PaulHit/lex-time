import { formatHoursDecimal } from "@/lib/time";
import { TimeEntry } from "@/lib/types";

export default function SummaryStats({ entries }: { entries: TimeEntry[] }) {
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.duration_minutes, 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;

  const stats = [
    { label: "Entries", value: String(entries.length) },
    { label: "Total hours", value: formatHoursDecimal(totalMinutes) },
    { label: "Billable hours", value: formatHoursDecimal(billableMinutes) },
    {
      label: "Non-billable hours",
      value: formatHoursDecimal(nonBillableMinutes),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {stat.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
