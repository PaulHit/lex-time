"use client";

import { formatDateLabel, formatDuration } from "@/lib/time";
import {
  TrashItem,
  TrashResponse,
  TrashedEntry,
  TrashedRecord,
} from "@/lib/types";

/** Selection spans three record types, so keys are namespaced by type. */
export const trashKey = (type: TrashItem["type"], id: number) =>
  `${type}:${id}`;

export function parseTrashKey(key: string): TrashItem {
  const [type, id] = key.split(":");
  return { type: type as TrashItem["type"], id: Number(id) };
}

const checkboxClass =
  "h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-stone-700";

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
  selected,
  onToggle,
  onToggleMany,
  onClearSelection,
  onRestore,
  onPurge,
  onRestoreSelected,
  onPurgeSelected,
  onEmptyTrash,
}: {
  trash: TrashResponse;
  selected: string[];
  onToggle: (key: string) => void;
  onToggleMany: (keys: string[], selected: boolean) => void;
  onClearSelection: () => void;
  onRestore: (items: TrashItem[]) => void;
  onPurge: (items: TrashItem[]) => void;
  onRestoreSelected: () => void;
  onPurgeSelected: () => void;
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

  const entryKeys = trash.entries.map((e) => trashKey("entry", e.id));
  const employeeKeys = trash.employees.map((r) => trashKey("employee", r.id));
  const clientKeys = trash.clients.map((r) => trashKey("client", r.id));
  const allKeys = [...entryKeys, ...employeeKeys, ...clientKeys];
  const allSelected = allKeys.every((k) => selected.includes(k));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-stone-500">
          Tick items to restore or remove several at once — for example an
          employee together with their entries. Restoring an entry on its own
          also restores its employee and client if needed.
        </p>
        <button
          onClick={onEmptyTrash}
          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
        >
          Empty trash
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2 shadow-sm">
          <span className="text-sm font-medium text-stone-700">
            {selected.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClearSelection}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-sand"
            >
              Clear selection
            </button>
            <button
              onClick={onRestoreSelected}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-stone-900"
            >
              Restore selected
            </button>
            <button
              onClick={onPurgeSelected}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-800"
            >
              Delete forever
            </button>
          </div>
        </div>
      ) : (
        <label className="flex w-fit items-center gap-2 text-xs font-medium text-stone-500">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={allSelected}
            onChange={() => onToggleMany(allKeys, !allSelected)}
          />
          Select everything in the trash ({total})
        </label>
      )}

      {trash.entries.length > 0 && (
        <Section
          title={`Time entries (${trash.entries.length})`}
          keys={entryKeys}
          selected={selected}
          onToggleMany={onToggleMany}
        >
          {trash.entries.map((entry) => (
            <Row
              key={entry.id}
              selected={selected.includes(trashKey("entry", entry.id))}
              onToggle={() => onToggle(trashKey("entry", entry.id))}
              onRestore={() => onRestore([{ type: "entry", id: entry.id }])}
              onPurge={() => onPurge([{ type: "entry", id: entry.id }])}
            >
              <EntryInfo entry={entry} />
            </Row>
          ))}
        </Section>
      )}

      {trash.employees.length > 0 && (
        <Section
          title={`Employees (${trash.employees.length})`}
          keys={employeeKeys}
          selected={selected}
          onToggleMany={onToggleMany}
        >
          {trash.employees.map((record) => (
            <Row
              key={record.id}
              selected={selected.includes(trashKey("employee", record.id))}
              onToggle={() => onToggle(trashKey("employee", record.id))}
              onRestore={() =>
                onRestore([{ type: "employee", id: record.id }])
              }
              onPurge={() => onPurge([{ type: "employee", id: record.id }])}
            >
              <RecordInfo record={record} />
            </Row>
          ))}
        </Section>
      )}

      {trash.clients.length > 0 && (
        <Section
          title={`Clients (${trash.clients.length})`}
          keys={clientKeys}
          selected={selected}
          onToggleMany={onToggleMany}
        >
          {trash.clients.map((record) => (
            <Row
              key={record.id}
              selected={selected.includes(trashKey("client", record.id))}
              onToggle={() => onToggle(trashKey("client", record.id))}
              onRestore={() => onRestore([{ type: "client", id: record.id }])}
              onPurge={() => onPurge([{ type: "client", id: record.id }])}
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
  keys,
  selected,
  onToggleMany,
  children,
}: {
  title: string;
  keys: string[];
  selected: string[];
  onToggleMany: (keys: string[], selected: boolean) => void;
  children: React.ReactNode;
}) {
  const allSelected = keys.every((k) => selected.includes(k));
  const someSelected = keys.some((k) => selected.includes(k));

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          aria-label={`Select all ${title}`}
          className={checkboxClass}
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = !allSelected && someSelected;
          }}
          onChange={() => onToggleMany(keys, !allSelected)}
        />
        <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface shadow-sm">
        {children}
      </ul>
    </section>
  );
}

function Row({
  children,
  selected,
  onToggle,
  onRestore,
  onPurge,
}: {
  children: React.ReactNode;
  selected: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition ${
        selected ? "bg-sand/70" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={selected}
          onChange={onToggle}
        />
        <div className="min-w-0">{children}</div>
      </div>
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

function EntryInfo({ entry }: { entry: TrashedEntry }) {
  return (
    <>
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
        {entry.notes
          ? `${entry.notes.slice(0, 70)}${entry.notes.length > 70 ? "…" : ""} — `
          : ""}
        deleted {formatDeletedAt(entry.deleted_at)}
      </p>
    </>
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
