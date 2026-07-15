"use client";

import { useState } from "react";

type Item = { id: number; name: string };

export default function CreatableSelect({
  label,
  items,
  value,
  onChange,
  onCreate,
  addLabel,
}: {
  label: string;
  items: Item[];
  value: number | null;
  onChange: (id: number) => void;
  onCreate: (name: string) => Promise<Item>;
  addLabel: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const created = await onCreate(name);
      onChange(created.id);
      setNewName("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      {adding ? (
        <div className="flex gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder={addLabel}
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={handleCreate}
            className="rounded-md bg-slate-900 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-1">
          <select
            value={value ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="" disabled>
              Select…
            </option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAdding(true)}
            title={addLabel}
            className="shrink-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
