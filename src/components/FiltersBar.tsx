import { Client, Employee } from "@/lib/types";

export type Filters = {
  employeeId: "all" | number;
  clientId: "all" | number;
  billable: "all" | "1" | "0";
  range: "all" | "today" | "week" | "month";
};

export const DEFAULT_FILTERS: Filters = {
  employeeId: "all",
  clientId: "all",
  billable: "all",
  range: "all",
};

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.employeeId !== "all" ||
    filters.clientId !== "all" ||
    filters.billable !== "all" ||
    filters.range !== "all"
  );
}

export default function FiltersBar({
  filters,
  onChange,
  onReset,
  employees,
  clients,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
  employees: Employee[];
  clients: Client[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm">
      <FilterSelect
        label="Employee"
        value={String(filters.employeeId)}
        onChange={(v) =>
          onChange({ ...filters, employeeId: v === "all" ? "all" : Number(v) })
        }
        options={[
          { value: "all", label: "All employees" },
          ...employees.map((e) => ({ value: String(e.id), label: e.name })),
        ]}
      />
      <FilterSelect
        label="Client"
        value={String(filters.clientId)}
        onChange={(v) =>
          onChange({ ...filters, clientId: v === "all" ? "all" : Number(v) })
        }
        options={[
          { value: "all", label: "All clients" },
          ...clients.map((c) => ({ value: String(c.id), label: c.name })),
        ]}
      />
      <FilterSelect
        label="Billability"
        value={filters.billable}
        onChange={(v) => onChange({ ...filters, billable: v as Filters["billable"] })}
        options={[
          { value: "all", label: "All" },
          { value: "1", label: "Billable only" },
          { value: "0", label: "Non-billable only" },
        ]}
      />
      <FilterSelect
        label="Date range"
        value={filters.range}
        onChange={(v) => onChange({ ...filters, range: v as Filters["range"] })}
        options={[
          { value: "all", label: "All time" },
          { value: "today", label: "Today" },
          { value: "week", label: "This week" },
          { value: "month", label: "This month" },
        ]}
      />
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={onReset}
          className="ml-auto self-end rounded-lg border border-line px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-sand"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-stone-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
