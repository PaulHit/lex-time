"use client";

import { useState } from "react";
import Modal from "./Modal";
import { Client, Employee } from "@/lib/types";

type Item = { id: number; name: string };

export default function ManageModal({
  open,
  onClose,
  employees,
  clients,
  onCreateEmployee,
  onCreateClient,
  onDeleteEmployee,
  onDeleteClient,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  clients: Client[];
  onCreateEmployee: (name: string) => Promise<Employee>;
  onCreateClient: (name: string) => Promise<Client>;
  onDeleteEmployee: (id: number) => Promise<string | null>;
  onDeleteClient: (id: number) => Promise<string | null>;
}) {
  return (
    <Modal open={open} onClose={onClose} title="People & clients">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ManageList
          heading="Employees"
          items={employees}
          addPlaceholder="New employee name"
          onCreate={onCreateEmployee}
          onDelete={onDeleteEmployee}
        />
        <ManageList
          heading="Clients"
          items={clients}
          addPlaceholder="New client name"
          onCreate={onCreateClient}
          onDelete={onDeleteClient}
        />
      </div>
      <p className="mt-5 border-t border-line pt-4 text-xs text-stone-500">
        Deleting an employee or client with logged time asks for confirmation,
        then moves it and all of its entries to the Trash — nothing is lost
        until the Trash is emptied.
      </p>
    </Modal>
  );
}

function ManageList({
  heading,
  items,
  addPlaceholder,
  onCreate,
  onDelete,
}: {
  heading: string;
  items: Item[];
  addPlaceholder: string;
  onCreate: (name: string) => Promise<Item>;
  onDelete: (id: number) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(trimmed);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    const err = await onDelete(id);
    if (err) setError(err);
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-stone-800">{heading}</h3>
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {items.length === 0 && (
          <li className="px-3 py-2 text-sm text-stone-400">None yet</li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-stone-700"
          >
            <span className="truncate">{item.name}</span>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              aria-label={`Delete ${item.name}`}
              className="shrink-0 rounded-md p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h12M8 6V4h4v2m-6 0v10a1 1 0 001 1h6a1 1 0 001-1V6M8.5 9v5M11.5 9v5" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={addPlaceholder}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
        />
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={handleAdd}
          className="rounded-lg bg-stone-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-stone-900 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
