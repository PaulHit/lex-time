"use client";

import { formatDateLabel, formatDuration } from "@/lib/time";
import { TimeEntry } from "@/lib/types";
import NotesCell from "./NotesCell";

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
      <div className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-stone-500 shadow-sm">
        Loading entries…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-stone-500">
        No time entries match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-sand text-xs uppercase tracking-wide text-stone-500">
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
        <tbody className="divide-y divide-line">
          {entries.map((entry) => (
            <tr key={entry.id} className="align-top transition hover:bg-sand/50">
              <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                {formatDateLabel(entry.date)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-stone-900">
                {entry.employee_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                {entry.client_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                {formatDuration(entry.duration_minutes)}
                {entry.start_time && entry.end_time && (
                  <span className="ml-1 text-xs text-stone-400">
                    ({entry.start_time}–{entry.end_time})
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.billable
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {entry.billable ? "Billable" : "Non-billable"}
                </span>
              </td>
              <td className="max-w-[260px] px-4 py-3">
                <NotesCell text={entry.notes} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(entry)}
                  className="mr-3 text-xs font-medium text-stone-700 hover:underline"
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
