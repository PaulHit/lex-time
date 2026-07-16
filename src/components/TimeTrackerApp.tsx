"use client";

import { useCallback, useEffect, useState } from "react";
import EntryForm, { EntryPayload } from "./EntryForm";
import EntriesTable from "./EntriesTable";
import SummaryStats from "./SummaryStats";
import FiltersBar, { Filters, DEFAULT_FILTERS } from "./FiltersBar";
import Modal from "./Modal";
import ManageModal from "./ManageModal";
import { rangeToDates } from "@/lib/time";
import { Client, Employee, TimeEntry } from "@/lib/types";

export default function TimeTrackerApp() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
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
      await loadEmployees();
      await loadClients();
    })();
  }, [loadEmployees, loadClients]);

  useEffect(() => {
    // Refetching from the server when filters change is intentional here,
    // not the accidental setState-in-effect pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries(filters);
  }, [filters, loadEntries]);

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

  async function deleteEmployee(id: number): Promise<string | null> {
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      return err.error ?? "Failed to delete employee";
    }
    await loadEmployees();
    // Clear a filter that pointed at the now-deleted employee, otherwise it
    // would keep silently filtering by a missing id and show nothing.
    if (filters.employeeId === id) {
      setFilters((f) => ({ ...f, employeeId: "all" }));
    }
    return null;
  }

  async function deleteClient(id: number): Promise<string | null> {
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      return err.error ?? "Failed to delete client";
    }
    await loadClients();
    if (filters.clientId === id) {
      setFilters((f) => ({ ...f, clientId: "all" }));
    }
    return null;
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
          <h1 className="text-2xl font-semibold text-stone-800">Lex Time</h1>
          <p className="text-sm text-stone-500">
            Firm-wide time tracking by employee, client, and billability
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <button
            onClick={() => setManageOpen(true)}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-sand"
          >
            Manage
          </button>
          <button
            onClick={openNewEntry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-900"
          >
            <span className="text-base leading-none">+</span>
            Log time
          </button>
        </div>
      </header>

      <SummaryStats entries={entries} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">Logged time</h2>
          <span className="text-xs text-stone-400">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters({ ...DEFAULT_FILTERS })}
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
          initial={editingEntry ?? undefined}
          onSubmit={handleSubmitEntry}
          onCancel={closeModal}
          onCreateEmployee={createEmployee}
          onCreateClient={createClient}
          submitLabel={editingEntry ? "Save changes" : "Log time"}
        />
      </Modal>

      <ManageModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        employees={employees}
        clients={clients}
        onCreateEmployee={createEmployee}
        onCreateClient={createClient}
        onDeleteEmployee={deleteEmployee}
        onDeleteClient={deleteClient}
      />
    </div>
  );
}
