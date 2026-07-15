"use client";

import { useState } from "react";

type Item = { id: number; name: string };

const fieldClass =
  "min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200";

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
      <label className="text-xs font-medium text-stone-600">{label}</label>
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
            className={fieldClass}
          />
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={handleCreate}
            className="rounded-lg bg-stone-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-stone-900 disabled:opacity-40"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-lg border border-line px-3 py-2 text-xs text-stone-600 transition hover:bg-sand"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-1">
          <select
            value={value ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className={fieldClass}
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
            className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-stone-600 transition hover:bg-sand"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
