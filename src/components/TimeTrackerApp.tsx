"use client";

import { useCallback, useEffect, useState } from "react";
import EntryForm, { EntryPayload } from "./EntryForm";
import EntriesTable from "./EntriesTable";
import SummaryStats from "./SummaryStats";
import FiltersBar, { Filters } from "./FiltersBar";
import Modal from "./Modal";
import { rangeToDates } from "@/lib/time";
import { Client, Employee, TimeEntry } from "@/lib/types";

const CURRENT_USER_KEY = "lex-time.current-employee-id";

export default function TimeTrackerApp() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<number | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [filters, setFilters] = useState<Filters>({
    employeeId: "all",
    clientId: "all",
    billable: "all",
    range: "all",
  });

  const loadEmployees = useCallback(async () => {
    const res = await fetch("/api/employees");
    const data: Employee[] = await res.json();
    setEmployees(data);
    return data;
  }, []);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    const data: Client[] = await res.json();
    setClients(data);
    return data;
  }, []);

  const loadEntries = useCallback(async (activeFilters: Filters) => {
    setLoadingEntries(true);
    const params = new URLSearchParams();
    if (activeFilters.employeeId !== "all")
      params.set("employeeId", String(activeFilters.employeeId));
    if (activeFilters.clientId !== "all")
      params.set("clientId", String(activeFilters.clientId));
    if (activeFilters.billable !== "all")
      params.set("billable", activeFilters.billable);
    const { from, to } = rangeToDates(activeFilters.range);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`/api/entries?${params.toString()}`);
    const data: TimeEntry[] = await res.json();
    setEntries(data);
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    (async () => {
      const emps = await loadEmployees();
      await loadClients();
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      const storedId = stored ? Number(stored) : null;
      if (storedId && emps.some((e) => e.id === storedId)) {
        setCurrentEmployeeId(storedId);
      } else if (emps.length > 0) {
        setCurrentEmployeeId(emps[0].id);
      }
    })();
  }, [loadEmployees, loadClients]);

  useEffect(() => {
    // Refetching from the server when filters change is intentional here,
    // not the accidental setState-in-effect pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries(filters);
  }, [filters, loadEntries]);

  function handleSwitchUser(id: number) {
    setCurrentEmployeeId(id);
    localStorage.setItem(CURRENT_USER_KEY, String(id));
  }

  function openNewEntry() {
    setEditingEntry(null);
    setModalOpen(true);
  }

  function openEditEntry(entry: TimeEntry) {
    setEditingEntry(entry);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingEntry(null);
  }

  async function createEmployee(name: string): Promise<Employee> {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const employee: Employee = await res.json();
    await loadEmployees();
    return employee;
  }

  async function createClient(name: string): Promise<Client> {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const client: Client = await res.json();
    await loadClients();
    return client;
  }

  async function handleSubmitEntry(payload: EntryPayload) {
    const url = editingEntry
      ? `/api/entries/${editingEntry.id}`
      : "/api/entries";
    const method = editingEntry ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to save entry");
    }
    closeModal();
    await loadEntries(filters);
  }

  async function handleDeleteEntry(entry: TimeEntry) {
    if (
      !confirm(
        `Delete the ${entry.date} entry for ${entry.client_name} (${entry.employee_name})?`,
      )
    )
      return;
    await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    await loadEntries(filters);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lex Time</h1>
          <p className="text-sm text-slate-500">
            Daily time tracking by client and billability
          </p>
        </div>
        <div className="flex items-center gap-3">
          {employees.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-500">
              <span className="hidden sm:inline">Logged in as</span>
              <select
                value={currentEmployeeId ?? ""}
                onChange={(e) => handleSwitchUser(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            onClick={openNewEntry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            <span className="text-base leading-none">+</span>
            Log time
          </button>
        </div>
      </header>

      <SummaryStats entries={entries} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Logged time</h2>
          <span className="text-xs text-slate-400">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          employees={employees}
          clients={clients}
        />
        <EntriesTable
          entries={entries}
          loading={loadingEntries}
          onEdit={openEditEntry}
          onDelete={handleDeleteEntry}
        />
      </section>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingEntry ? "Edit time entry" : "Log time"}
      >
        <EntryForm
          key={editingEntry?.id ?? "new"}
          employees={employees}
          clients={clients}
          defaultEmployeeId={currentEmployeeId}
          initial={editingEntry ?? undefined}
          onSubmit={handleSubmitEntry}
          onCancel={closeModal}
          onCreateEmployee={createEmployee}
          onCreateClient={createClient}
          submitLabel={editingEntry ? "Save changes" : "Log time"}
        />
      </Modal>
    </div>
  );
}
