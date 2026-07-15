"use client";

import { formatDateLabel, formatDuration } from "@/lib/time";
import { TimeEntry } from "@/lib/types";

export default function EntriesTable({
  entries,
  loading,
  onEdit,
  onDelete,
}: {
  entries: TimeEntry[];
  loading: boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800">
        Loading entries…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
        No time entries match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Billable</th>
            <th className="px-4 py-3 font-medium">Notes</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map((entry) => (
            <tr key={entry.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-3">
                {formatDateLabel(entry.date)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {entry.employee_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {entry.client_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {formatDuration(entry.duration_minutes)}
                {entry.start_time && entry.end_time && (
                  <span className="ml-1 text-xs text-slate-400">
                    ({entry.start_time}–{entry.end_time})
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.billable
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {entry.billable ? "Billable" : "Non-billable"}
                </span>
              </td>
              <td className="max-w-[240px] px-4 py-3 text-slate-600 dark:text-slate-400">
                {entry.notes || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(entry)}
                  className="mr-3 text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(entry)}
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
