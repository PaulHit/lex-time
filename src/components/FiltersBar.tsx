import { Client, Employee } from "@/lib/types";

export type Filters = {
  employeeId: "all" | number;
  clientId: "all" | number;
  billable: "all" | "1" | "0";
  range: "all" | "today" | "week" | "month";
};

export default function FiltersBar({
  filters,
  onChange,
  employees,
  clients,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  employees: Employee[];
  clients: Client[];
}) {
  return (
    <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
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
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
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
