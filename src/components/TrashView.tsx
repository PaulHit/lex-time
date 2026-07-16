"use client";

import { formatDateLabel, formatDuration } from "@/lib/time";
import { TrashResponse, TrashedEntry, TrashedRecord } from "@/lib/types";

function formatDeletedAt(sqliteUtc: string) {
  // SQLite datetime('now') is UTC "YYYY-MM-DD HH:MM:SS".
  const d = new Date(sqliteUtc.replace(" ", "T") + "Z");
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrashView({
  trash,
  onRestoreEntry,
  onRestoreRecord,
  onPurgeEntry,
  onPurgeRecord,
  onEmptyTrash,
}: {
  trash: TrashResponse;
  onRestoreEntry: (entry: TrashedEntry) => void;
  onRestoreRecord: (type: "employee" | "client", record: TrashedRecord) => void;
  onPurgeEntry: (entry: TrashedEntry) => void;
  onPurgeRecord: (type: "employee" | "client", record: TrashedRecord) => void;
  onEmptyTrash: () => void;
}) {
  const total =
    trash.entries.length + trash.employees.length + trash.clients.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center text-sm text-stone-500">
        The trash is empty. Deleted entries, employees, and clients end up
        here, where they can be restored or removed permanently.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          Deleted items can be restored, or removed permanently. Restoring an
          entry also restores its employee and client if needed.
        </p>
        <button
          onClick={onEmptyTrash}
          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
        >
          Empty trash
        </button>
      </div>

      {trash.entries.length > 0 && (
        <Section title={`Time entries (${trash.entries.length})`}>
          {trash.entries.map((entry) => (
            <Row
              key={entry.id}
              onRestore={() => onRestoreEntry(entry)}
              onPurge={() => onPurgeEntry(entry)}
            >
              <p className="text-sm text-stone-800">
                <span className="font-medium">{entry.employee_name}</span>
                {" · "}
                {entry.client_name}
                {" · "}
                {formatDuration(entry.duration_minutes)}
                {" · "}
                {formatDateLabel(entry.date)}
              </p>
              <p className="text-xs text-stone-400">
                {entry.notes ? `${entry.notes.slice(0, 70)}${entry.notes.length > 70 ? "…" : ""} — ` : ""}
                deleted {formatDeletedAt(entry.deleted_at)}
              </p>
            </Row>
          ))}
        </Section>
      )}

      {trash.employees.length > 0 && (
        <Section title={`Employees (${trash.employees.length})`}>
          {trash.employees.map((record) => (
            <Row
              key={record.id}
              onRestore={() => onRestoreRecord("employee", record)}
              onPurge={() => onPurgeRecord("employee", record)}
            >
              <RecordInfo record={record} />
            </Row>
          ))}
        </Section>
      )}

      {trash.clients.length > 0 && (
        <Section title={`Clients (${trash.clients.length})`}>
          {trash.clients.map((record) => (
            <Row
              key={record.id}
              onRestore={() => onRestoreRecord("client", record)}
              onPurge={() => onPurgeRecord("client", record)}
            >
              <RecordInfo record={record} />
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface shadow-sm">
        {children}
      </ul>
    </section>
  );
}

function Row({
  children,
  onRestore,
  onPurge,
}: {
  children: React.ReactNode;
  onRestore: () => void;
  onPurge: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">{children}</div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onRestore}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-sand"
        >
          Restore
        </button>
        <button
          onClick={onPurge}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
        >
          Delete forever
        </button>
      </div>
    </li>
  );
}

function RecordInfo({ record }: { record: TrashedRecord }) {
  return (
    <>
      <p className="text-sm font-medium text-stone-800">{record.name}</p>
      <p className="text-xs text-stone-400">
        {record.trashedEntryCount > 0
          ? `${record.trashedEntryCount} trashed ${
              record.trashedEntryCount === 1 ? "entry" : "entries"
            } — `
          : ""}
        deleted {formatDeletedAt(record.deleted_at)}
      </p>
    </>
  );
}
