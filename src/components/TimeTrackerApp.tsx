"use client";

import { useCallback, useEffect, useState } from "react";
import EntryForm, { EntryPayload } from "./EntryForm";
import EntriesTable from "./EntriesTable";
import SummaryStats from "./SummaryStats";
import FiltersBar, { Filters, DEFAULT_FILTERS } from "./FiltersBar";
import Modal from "./Modal";
import ManageModal from "./ManageModal";
import Pagination from "./Pagination";
import TrashView, { parseTrashKey } from "./TrashView";
import ConfirmDialog, { ConfirmRequest } from "./ConfirmDialog";
import { formatDateLabel, rangeToDates } from "@/lib/time";
import {
  Client,
  EntriesResponse,
  Employee,
  TimeEntry,
  TrashItem,
  TrashResponse,
} from "@/lib/types";

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_TRASH: TrashResponse = { entries: [], employees: [], clients: [] };

export default function TimeTrackerApp() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    totalMinutes: 0,
    billableMinutes: 0,
  });
  const [trash, setTrash] = useState<TrashResponse>(EMPTY_TRASH);
  const [view, setView] = useState<"log" | "trash">("log");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [trashSelected, setTrashSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });

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

  const loadTrash = useCallback(async () => {
    const res = await fetch("/api/trash");
    const data: TrashResponse = await res.json();
    setTrash(data);
    return data;
  }, []);

  const loadEntries = useCallback(
    async (activeFilters: Filters, activePage: number, activeSize: number) => {
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
      params.set("limit", String(activeSize));
      params.set("offset", String((activePage - 1) * activeSize));

      const res = await fetch(`/api/entries?${params.toString()}`);
      const data: EntriesResponse = await res.json();
      setEntries(data.entries);
      setSummary({
        total: data.total,
        totalMinutes: data.totalMinutes,
        billableMinutes: data.billableMinutes,
      });
      setLoadingEntries(false);
      return data;
    },
    [],
  );

  useEffect(() => {
    (async () => {
      await loadEmployees();
      await loadClients();
      await loadTrash();
    })();
  }, [loadEmployees, loadClients, loadTrash]);

  useEffect(() => {
    // Refetching from the server when filters/paging change is intentional
    // here, not the accidental setState-in-effect pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries(filters, page, pageSize);
  }, [filters, page, pageSize, loadEntries]);

  /** Reload everything a mutation can touch, and keep the page in range. */
  async function refreshData() {
    const [data] = await Promise.all([
      loadEntries(filters, page, pageSize),
      loadEmployees(),
      loadClients(),
      loadTrash(),
    ]);
    const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }

  // Filter and page-size changes reset paging — otherwise you can land on a
  // page number that no longer exists in the new result set.
  function changeFilters(next: Filters) {
    setFilters(next);
    setPage(1);
    setSelectedIds([]);
  }

  function changePageSize(next: number) {
    setPageSize(next);
    setPage(1);
  }

  function toggleRow(id: number) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  }

  function togglePage(pageIds: number[], selected: boolean) {
    setSelectedIds((ids) =>
      selected
        ? [...new Set([...ids, ...pageIds])]
        : ids.filter((i) => !pageIds.includes(i)),
    );
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
    await Promise.all([loadEmployees(), loadTrash()]);
    return employee;
  }

  async function createClient(name: string): Promise<Client> {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const client: Client = await res.json();
    await Promise.all([loadClients(), loadTrash()]);
    return client;
  }

  function resetRecordFilter(type: "employee" | "client", id: number) {
    // Clear a filter that pointed at the now-deleted record, otherwise it
    // would keep silently filtering by a missing id and show nothing.
    if (type === "employee" && filters.employeeId === id) {
      setFilters((f) => ({ ...f, employeeId: "all" }));
    }
    if (type === "client" && filters.clientId === id) {
      setFilters((f) => ({ ...f, clientId: "all" }));
    }
  }

  async function deleteRecord(
    type: "employee" | "client",
    id: number,
  ): Promise<string | null> {
    const base = type === "employee" ? "/api/employees" : "/api/clients";
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });

    if (res.status === 409) {
      const info: { entryCount: number } = await res.json();
      const list: { id: number; name: string }[] =
        type === "employee" ? employees : clients;
      const name = list.find((r) => r.id === id)?.name ?? `This ${type}`;
      setConfirm({
        title: `Delete ${name}?`,
        message: `${name} has ${info.entryCount} time ${
          info.entryCount === 1 ? "entry" : "entries"
        }. The ${type} and all of ${
          info.entryCount === 1 ? "its entry" : "those entries"
        } will move to the Trash, where they can be restored.`,
        confirmLabel: "Move to Trash",
        onConfirm: async () => {
          await fetch(`${base}/${id}?cascade=1`, { method: "DELETE" });
          resetRecordFilter(type, id);
          setSelectedIds([]);
          await refreshData();
        },
      });
      return null;
    }

    if (!res.ok) {
      const err = await res.json();
      return err.error ?? `Failed to delete ${type}`;
    }

    resetRecordFilter(type, id);
    await refreshData();
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
    await refreshData();
  }

  function handleDeleteEntry(entry: TimeEntry) {
    setConfirm({
      title: "Move entry to Trash?",
      message: `The ${formatDateLabel(entry.date)} entry for ${
        entry.client_name
      } (${entry.employee_name}) will move to the Trash, where it can be restored.`,
      confirmLabel: "Move to Trash",
      onConfirm: async () => {
        await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
        setSelectedIds((ids) => ids.filter((i) => i !== entry.id));
        await refreshData();
      },
    });
  }

  function handleBulkDelete() {
    const count = selectedIds.length;
    setConfirm({
      title: `Delete ${count} selected ${count === 1 ? "entry" : "entries"}?`,
      message:
        "They will move to the Trash, where they can be restored or removed permanently.",
      confirmLabel: "Move to Trash",
      onConfirm: async () => {
        await fetch("/api/entries/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });
        setSelectedIds([]);
        await refreshData();
      },
    });
  }

  function toggleTrashRow(key: string) {
    setTrashSelected((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  }

  function toggleTrashMany(keys: string[], selected: boolean) {
    setTrashSelected((current) =>
      selected
        ? [...new Set([...current, ...keys])]
        : current.filter((k) => !keys.includes(k)),
    );
  }

  async function restoreItems(items: TrashItem[]) {
    await fetch("/api/trash/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setTrashSelected([]);
    await refreshData();
  }

  function purgeItems(items: TrashItem[], title: string, message: string) {
    setConfirm({
      title,
      message,
      confirmLabel: "Delete forever",
      onConfirm: async () => {
        await fetch("/api/trash/purge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        setTrashSelected([]);
        await refreshData();
      },
    });
  }

  /** Describes a purge batch, including entries swept along with records. */
  function confirmPurge(items: TrashItem[]) {
    const records = items.filter((i) => i.type !== "entry");
    const sweptEntries = records.reduce((sum, item) => {
      const list = item.type === "employee" ? trash.employees : trash.clients;
      return sum + (list.find((r) => r.id === item.id)?.trashedEntryCount ?? 0);
    }, 0);

    if (items.length === 1) {
      const [item] = items;
      if (item.type === "entry") {
        const entry = trash.entries.find((e) => e.id === item.id);
        purgeItems(
          items,
          "Delete forever?",
          entry
            ? `The ${formatDateLabel(entry.date)} entry for ${entry.client_name} (${entry.employee_name}) will be permanently deleted. This cannot be undone.`
            : "This entry will be permanently deleted. This cannot be undone.",
        );
        return;
      }
      const list = item.type === "employee" ? trash.employees : trash.clients;
      const record = list.find((r) => r.id === item.id);
      const also =
        sweptEntries > 0
          ? ` along with ${sweptEntries} trashed ${
              sweptEntries === 1 ? "entry" : "entries"
            }`
          : "";
      purgeItems(
        items,
        "Delete forever?",
        `${record?.name ?? "This record"} will be permanently deleted${also}. This cannot be undone.`,
      );
      return;
    }

    purgeItems(
      items,
      `Delete ${items.length} items forever?`,
      records.length > 0 && sweptEntries > 0
        ? `This also permanently deletes ${sweptEntries} trashed ${
            sweptEntries === 1 ? "entry" : "entries"
          } belonging to the selected employees and clients. This cannot be undone.`
        : "The selected items will be permanently deleted. This cannot be undone.",
    );
  }

  function handleEmptyTrash() {
    const total =
      trash.entries.length + trash.employees.length + trash.clients.length;
    setConfirm({
      title: "Empty trash?",
      message: `All ${total} trashed ${
        total === 1 ? "item" : "items"
      } will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Empty trash",
      onConfirm: async () => {
        await fetch("/api/trash/purge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        setTrashSelected([]);
        await refreshData();
      },
    });
  }

  const trashCount =
    trash.entries.length + trash.employees.length + trash.clients.length;

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

      <div className="flex self-start rounded-xl border border-line bg-surface p-1 shadow-sm">
        <TabButton active={view === "log"} onClick={() => setView("log")}>
          Time log
        </TabButton>
        <TabButton
          active={view === "trash"}
          onClick={() => {
            setView("trash");
            loadTrash();
          }}
        >
          Trash{trashCount > 0 ? ` (${trashCount})` : ""}
        </TabButton>
      </div>

      {view === "log" ? (
        <>
          <SummaryStats
            total={summary.total}
            totalMinutes={summary.totalMinutes}
            billableMinutes={summary.billableMinutes}
          />

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-700">
                Logged time
              </h2>
              <span className="text-xs text-stone-400">
                {summary.total} {summary.total === 1 ? "entry" : "entries"}
              </span>
            </div>
            <FiltersBar
              filters={filters}
              onChange={changeFilters}
              onReset={() => changeFilters({ ...DEFAULT_FILTERS })}
              employees={employees}
              clients={clients}
            />
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2 shadow-sm">
                <span className="text-sm font-medium text-stone-700">
                  {selectedIds.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedIds([])}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-sand"
                  >
                    Clear selection
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-800"
                  >
                    Delete selected
                  </button>
                </div>
              </div>
            )}
            <EntriesTable
              entries={entries}
              loading={loadingEntries}
              selectedIds={selectedIds}
              onToggleRow={toggleRow}
              onTogglePage={togglePage}
              onEdit={openEditEntry}
              onDelete={handleDeleteEntry}
            />
            {summary.total > 0 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                total={summary.total}
                onPageChange={setPage}
                onPageSizeChange={changePageSize}
              />
            )}
          </section>
        </>
      ) : (
        <TrashView
          trash={trash}
          selected={trashSelected}
          onToggle={toggleTrashRow}
          onToggleMany={toggleTrashMany}
          onClearSelection={() => setTrashSelected([])}
          onRestore={restoreItems}
          onPurge={confirmPurge}
          onRestoreSelected={() =>
            restoreItems(trashSelected.map(parseTrashKey))
          }
          onPurgeSelected={() => confirmPurge(trashSelected.map(parseTrashKey))}
          onEmptyTrash={handleEmptyTrash}
        />
      )}

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
        onDeleteEmployee={(id) => deleteRecord("employee", id)}
        onDeleteClient={(id) => deleteRecord("client", id)}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-stone-800 text-white" : "text-stone-600 hover:bg-sand"
      }`}
    >
      {children}
    </button>
  );
}
