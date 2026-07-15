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
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading entries…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No time entries match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Billable</th>
            <th className="px-4 py-3 font-medium">Notes</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <tr key={entry.id} className="align-top transition hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                {formatDateLabel(entry.date)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                {entry.employee_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                {entry.client_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
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
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {entry.billable ? "Billable" : "Non-billable"}
                </span>
              </td>
              <td className="max-w-[240px] px-4 py-3 text-slate-600">
                {entry.notes || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(entry)}
                  className="mr-3 text-xs font-medium text-indigo-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(entry)}
                  className="text-xs font-medium text-red-600 hover:underline"
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
